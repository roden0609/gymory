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

const mappings = await fetchAll("equipment_legacy_field_mappings", {
  select: "legacy_field,equipment_code,value_kind,is_alias",
  order: "legacy_field",
});

if (mappings.length === 0) {
  throw new Error("No legacy equipment mappings found. Has migration 0043 run?");
}

const legacyFields = mappings.map((mapping) => mapping.legacy_field);
const select = ["id", "slug", ...legacyFields].join(",");

const [legacyGyms, normalizedGyms, conflicts] = await Promise.all([
  fetchAll("gyms", { select, order: "id" }),
  fetchAll("gyms_normalized", { select, order: "id" }),
  fetchAll("gym_equipment_migration_conflicts", {
    select: "gym_id,equipment_code,conflict_type",
  }),
]);

const normalizedById = new Map(normalizedGyms.map((gym) => [gym.id, gym]));
const conflictsByGymAndCode = new Map(
  conflicts.map((conflict) => [
    `${conflict.gym_id}:${conflict.equipment_code}`,
    conflict.conflict_type,
  ])
);
const mappingByField = new Map(
  mappings.map((mapping) => [mapping.legacy_field, mapping])
);

const classifiedDifferences = [];
const unclassifiedDifferences = [];

for (const legacyGym of legacyGyms) {
  const normalizedGym = normalizedById.get(legacyGym.id);
  if (!normalizedGym) {
    unclassifiedDifferences.push({
      gymId: legacyGym.id,
      slug: legacyGym.slug,
      field: "<row>",
      legacy: "present",
      normalized: "missing",
    });
    continue;
  }

  for (const field of legacyFields) {
    if (Object.is(legacyGym[field], normalizedGym[field])) continue;

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
      normalized: normalizedGym[field],
      ...(conflictType ? { conflictType } : {}),
    };

    if (conflictType || mapping.is_alias) {
      classifiedDifferences.push(difference);
    } else {
      unclassifiedDifferences.push(difference);
    }
  }
}

console.log(`Mappings: ${mappings.length}`);
console.log(`Legacy gyms: ${legacyGyms.length}`);
console.log(`Normalized gyms: ${normalizedGyms.length}`);
console.log(`Migration conflicts: ${conflicts.length}`);
console.log(`Classified differences: ${classifiedDifferences.length}`);
console.log(`Unclassified differences: ${unclassifiedDifferences.length}`);

if (classifiedDifferences.length > 0) {
  console.log("\nClassified difference examples:");
  console.log(JSON.stringify(classifiedDifferences.slice(0, 20), null, 2));
}

if (unclassifiedDifferences.length > 0) {
  console.error("\nUnclassified difference examples:");
  console.error(JSON.stringify(unclassifiedDifferences.slice(0, 50), null, 2));
  process.exitCode = 1;
} else {
  console.log("\nValidation passed with no unclassified differences.");
}

async function fetchAll(table, searchParams) {
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
