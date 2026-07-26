#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
await loadEnvFile(args.env ?? "apps/web/.env.dev");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !apiKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for validation."
  );
}

const headers = {
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`,
  Accept: "application/json",
};

const [gyms, normalizedGyms, inventoryItems, equipmentTypes] = await Promise.all([
  fetchAll("gyms", { select: "id,slug,is_active", order: "id" }),
  fetchAll("gyms_normalized", {
    select: "id,slug,is_active",
    order: "id",
  }),
  fetchAll("gym_equipment_inventory", {
    select: "gym_id,equipment_code,is_present,quantity",
    order: "gym_id,equipment_code",
  }),
  fetchAll("equipment_types", {
    select: "code",
    order: "code",
  }),
]);

const gymsById = new Map(gyms.map((gym) => [gym.id, gym]));
const normalizedIds = new Set(normalizedGyms.map((gym) => gym.id));
const equipmentTypesByCode = new Map(
  equipmentTypes.map((equipmentType) => [equipmentType.code, equipmentType])
);
const inventoryKeys = new Set();
const issues = [];

for (const gym of gyms) {
  if (!normalizedIds.has(gym.id)) {
    issues.push({
      type: "missing_normalized_gym",
      gymId: gym.id,
      slug: gym.slug,
    });
  }
}

for (const normalizedGym of normalizedGyms) {
  if (!gymsById.has(normalizedGym.id)) {
    issues.push({
      type: "orphan_normalized_gym",
      gymId: normalizedGym.id,
      slug: normalizedGym.slug,
    });
  }
}

for (const item of inventoryItems) {
  const key = `${item.gym_id}:${item.equipment_code}`;
  if (inventoryKeys.has(key)) {
    issues.push({ type: "duplicate_inventory", key });
  }
  inventoryKeys.add(key);

  if (!gymsById.has(item.gym_id)) {
    issues.push({
      type: "orphan_inventory_gym",
      gymId: item.gym_id,
      equipmentCode: item.equipment_code,
    });
  }

  const equipmentType = equipmentTypesByCode.get(item.equipment_code);
  if (!equipmentType) {
    issues.push({
      type: "unknown_equipment_code",
      gymId: item.gym_id,
      equipmentCode: item.equipment_code,
    });
  }

  if (item.is_present === null && item.quantity === null) {
    issues.push({ type: "inventory_without_value", key });
  }
  if (
    item.quantity !== null &&
    (!Number.isInteger(item.quantity) || item.quantity < 0)
  ) {
    issues.push({ type: "invalid_quantity", key, quantity: item.quantity });
  }
  if (item.quantity === 0 && item.is_present === true) {
    issues.push({ type: "zero_quantity_marked_present", key });
  }
  if (item.quantity > 0 && item.is_present === false) {
    issues.push({ type: "positive_quantity_marked_absent", key });
  }
}

const legacyMappings = await fetchAll(
  "equipment_legacy_field_mappings",
  {
    select: "legacy_field,equipment_code,is_alias",
    order: "legacy_field",
  },
  { allowMissing: true }
);
const classifiedLegacyDifferences = [];

if (legacyMappings) {
  const legacyFields = legacyMappings.map((mapping) => mapping.legacy_field);
  const legacySelect = ["id", "slug", ...legacyFields].join(",");
  const [legacyGyms, compatibilityGyms, conflicts] = await Promise.all([
    fetchAll("gyms", { select: legacySelect, order: "id" }),
    fetchAll("gyms_normalized", { select: legacySelect, order: "id" }),
    fetchAll("gym_equipment_migration_conflicts", {
      select: "gym_id,equipment_code,conflict_type",
    }),
  ]);
  const compatibilityById = new Map(
    compatibilityGyms.map((gym) => [gym.id, gym])
  );
  const mappingByField = new Map(
    legacyMappings.map((mapping) => [mapping.legacy_field, mapping])
  );
  const conflictsByGymAndCode = new Map(
    conflicts.map((conflict) => [
      `${conflict.gym_id}:${conflict.equipment_code}`,
      conflict.conflict_type,
    ])
  );

  for (const legacyGym of legacyGyms) {
    const compatibilityGym = compatibilityById.get(legacyGym.id);
    if (!compatibilityGym) continue;

    for (const field of legacyFields) {
      if (Object.is(legacyGym[field], compatibilityGym[field])) continue;

      const mapping = mappingByField.get(field);
      const conflictType = conflictsByGymAndCode.get(
        `${legacyGym.id}:${mapping.equipment_code}`
      );
      const difference = {
        gymId: legacyGym.id,
        slug: legacyGym.slug,
        field,
        equipmentCode: mapping.equipment_code,
        legacy: legacyGym[field],
        normalized: compatibilityGym[field],
        ...(conflictType ? { conflictType } : {}),
      };

      if (mapping.is_alias || conflictType) {
        classifiedLegacyDifferences.push(difference);
      } else {
        issues.push({ type: "unclassified_legacy_difference", ...difference });
      }
    }
  }
}

console.log(`Gyms: ${gyms.length}`);
console.log(`Normalized gyms: ${normalizedGyms.length}`);
console.log(`Equipment types: ${equipmentTypes.length}`);
console.log(`Inventory rows: ${inventoryItems.length}`);
console.log(
  legacyMappings
    ? `Legacy reconciliation: ${classifiedLegacyDifferences.length} classified differences`
    : "Legacy reconciliation: not applicable after schema cleanup"
);
console.log(`Integrity issues: ${issues.length}`);

if (classifiedLegacyDifferences.length > 0) {
  console.log("\nClassified legacy difference examples:");
  console.log(
    JSON.stringify(classifiedLegacyDifferences.slice(0, 20), null, 2)
  );
}

if (issues.length > 0) {
  console.error("\nIntegrity issue examples:");
  console.error(JSON.stringify(issues.slice(0, 50), null, 2));
  process.exitCode = 1;
} else {
  console.log("\nNormalized inventory validation passed.");
}

async function fetchAll(
  table,
  searchParams,
  { allowMissing = false } = {}
) {
  const pageSize = 500;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        ...headers,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });

    if (allowMissing && response.status === 404 && offset === 0) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `${table} validation read failed: ${response.status} ${await response.text()}`
      );
    }

    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== "--env") continue;
    parsed.env = argv[index + 1];
    index += 1;
  }
  return parsed;
}

async function loadEnvFile(filePath) {
  let raw;
  try {
    raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    const value = match[2].trim();
    process.env[match[1]] =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1).replace(/\\n/g, "\n")
        : value;
  }
}
