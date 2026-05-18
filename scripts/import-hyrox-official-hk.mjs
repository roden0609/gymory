#!/usr/bin/env node

/**
 * Sync Hong Kong gyms listed by the HYROX partner gym finder.
 *
 * This importer is intentionally conservative:
 * - dry run by default
 * - creates new gym rows only when no likely existing gym is found
 * - updates existing gyms with HYROX metadata only
 * - never clears equipment or community-submitted fields
 *
 * Usage:
 *   node scripts/import-hyrox-official-hk.mjs
 *   node scripts/import-hyrox-official-hk.mjs --out data/imports/hyrox-official-hk.json
 *   node scripts/import-hyrox-official-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const SOURCE_URL = "https://hyrox.com/find-a-hyrox-partner-gym/";
const FINDER_ENDPOINT =
  "https://gyms.elbnetz.cloud/wp-admin/admin-ajax.php?action=store_search&lat=22.3193&lng=114.16936&max_results=1000&search_radius=100";

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const partnerGyms = args["details-file"]
    ? await loadDetailsFile(args["details-file"])
    : await fetchHyroxPartnerGyms();

  const rows = partnerGyms
    .filter(isHongKongPartnerGym)
    .map(mapPartnerGymToGymRow)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const unknownDistricts = rows.filter((row) => !row.district_code);
  if (unknownDistricts.length > 0) {
    const examples = unknownDistricts
      .slice(0, 10)
      .map((row) => `- ${row.slug}: ${row.address ?? "no address"}`)
      .join("\n");
    throw new Error(
      [
        `Could not infer district_code for ${unknownDistricts.length} HYROX gyms.`,
        "Add a keyword to inferDistrictCode before importing.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/hyrox-official-hk.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} HYROX official HK rows to ${outPath}`);

  if (args.upsert) {
    const result = await upsertRows(rows);
    console.log(
      [
        `Inserted ${result.inserted} new gyms.`,
        `Updated ${result.updated} existing gyms.`,
        `Skipped ${result.skipped} unchanged gyms.`,
      ].join(" ")
    );
  } else {
    console.log("Dry run only. Pass --upsert to write HYROX metadata to Supabase.");
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

async function loadEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    let raw;
    try {
      raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n");
  }
  return trimmed;
}

async function loadDetailsFile(filePath) {
  const raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
  return JSON.parse(raw);
}

async function fetchHyroxPartnerGyms() {
  const response = await fetch(FINDER_ENDPOINT, {
    headers: {
      "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
      Accept: "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HYROX partner finder failed: ${response.status} ${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text);
  if (!Array.isArray(payload)) {
    throw new Error("Expected HYROX partner finder to return an array");
  }

  return payload;
}

function isHongKongPartnerGym(item) {
  const haystack = [item.store, item.address, item.address2, item.city, item.country]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("macau") || haystack.includes("macao")) return false;
  return haystack.includes("hong kong") || haystack.includes("kowloon");
}

function mapPartnerGymToGymRow(item) {
  const name = decodeHtml(getString(item.store)) ?? "HYROX Partner Gym";
  const address = decodeHtml(
    [item.address, item.address2].map(getString).filter(Boolean).join(", ")
  );
  const city = decodeHtml(getString(item.city));
  const slug = buildSlug([name, city && !name.toLowerCase().includes(city.toLowerCase()) ? city : null]);
  const districtText = [name, address, city].filter(Boolean).join(" ");
  const syncedAt = new Date().toISOString();

  return {
    name,
    name_zh: null,
    slug,
    address: address || null,
    address_zh: null,
    district_code: inferDistrictCode(districtText),
    country_code: "HK",
    postal_code: null,
    website_url: normalizeUrl(getString(item.url)),
    instagram_url: null,
    contact_phone: getString(item.phone),
    lat: toNumber(item.lat),
    lng: toNumber(item.lng),
    size_category: null,
    estimated_size_sqft: null,
    opening_hours_json: null,
    day_pass_price: null,
    is_active: true,
    is_verified: false,
    is_hyrox_official: true,
    hyrox_partner_id: getString(item.id),
    hyrox_source_url: SOURCE_URL,
    hyrox_source_synced_at: syncedAt,
    data_source: "import",
    data_accuracy_status: "normal",
    data_accuracy_flagged_at: null,
    equipment_last_verified_at: null,
    last_reported_at: syncedAt,
  };
}

async function upsertRows(rows) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !apiKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before running --upsert."
    );
  }

  const existingGyms = await fetchExistingGyms({ supabaseUrl, apiKey });
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = findExistingGym(existingGyms, row);

    if (!existing) {
      const insertedGym = await insertGym({ supabaseUrl, apiKey, row });
      existingGyms.push(insertedGym);
      await insertSubmission({
        supabaseUrl,
        apiKey,
        gymId: insertedGym.id,
        submissionType: "add_gym",
        actionType: "I",
        payload: { snapshot: insertedGym },
        changedFields: buildChangedFields(null, insertedGym),
      });
      inserted += 1;
      continue;
    }

    const updateRow = buildHyroxMetadataUpdate(existing, row);
    const changedFields = buildChangedFields(existing, updateRow);
    if (!changedFields) {
      skipped += 1;
      continue;
    }

    const updatedGym = await updateGym({
      supabaseUrl,
      apiKey,
      gymId: existing.id,
      row: updateRow,
    });
    Object.assign(existing, updatedGym);
    await insertSubmission({
      supabaseUrl,
      apiKey,
      gymId: existing.id,
      submissionType: "edit_gym_info",
      actionType: "U",
      payload: { snapshot: updatedGym },
      changedFields,
    });
    updated += 1;
  }

  return { inserted, updated, skipped };
}

async function fetchExistingGyms({ supabaseUrl, apiKey }) {
  const url = new URL(`${supabaseUrl}/rest/v1/gyms`);
  url.searchParams.set(
    "select",
    [
      "id",
      "name",
      "name_zh",
      "slug",
      "address",
      "address_zh",
      "lat",
      "lng",
      "is_hyrox_official",
      "hyrox_partner_id",
      "hyrox_source_url",
      "hyrox_source_synced_at",
      "last_reported_at",
    ].join(",")
  );
  url.searchParams.set("is_active", "eq.true");

  const response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function findExistingGym(existingGyms, row) {
  const rowPartnerId = normalizeText(row.hyrox_partner_id);
  const rowSlug = normalizeText(row.slug);
  const rowName = normalizeName(row.name);
  const rowAddress = normalizeAddress(row.address);

  return (
    existingGyms.find(
      (gym) =>
        rowPartnerId &&
        normalizeText(gym.hyrox_partner_id) &&
        normalizeText(gym.hyrox_partner_id) === rowPartnerId
    ) ??
    existingGyms.find((gym) => normalizeText(gym.slug) === rowSlug) ??
    existingGyms.find((gym) => normalizeName(gym.name) === rowName) ??
    existingGyms.find((gym) => {
      const existingAddress = normalizeAddress(gym.address);
      return (
        rowAddress &&
        existingAddress &&
        (rowAddress === existingAddress ||
          rowAddress.includes(existingAddress) ||
          existingAddress.includes(rowAddress))
      );
    }) ??
    existingGyms.find((gym) => isLikelySamePlace(gym, row)) ??
    null
  );
}

function buildHyroxMetadataUpdate(existing, row) {
  const update = {
    is_hyrox_official: true,
    hyrox_source_url: SOURCE_URL,
    hyrox_source_synced_at: row.hyrox_source_synced_at,
    last_reported_at: row.last_reported_at,
  };

  if (!existing.hyrox_partner_id || existing.hyrox_partner_id === row.hyrox_partner_id) {
    update.hyrox_partner_id = row.hyrox_partner_id;
  }

  return update;
}

async function insertGym({ supabaseUrl, apiKey, row }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/gyms`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

async function updateGym({ supabaseUrl, apiKey, gymId, row }) {
  const url = new URL(`${supabaseUrl}/rest/v1/gyms`);
  url.searchParams.set("id", `eq.${gymId}`);
  url.searchParams.set("select", "*");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(`Supabase update failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

async function insertSubmission({
  supabaseUrl,
  apiKey,
  gymId,
  submissionType,
  actionType,
  payload,
  changedFields,
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/gym_update_submissions`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      gym_id: gymId,
      submitted_by_user_id: null,
      submission_type: submissionType,
      status: "approved",
      payload,
      changed_fields: changedFields,
      action_type: actionType,
      actor_type: "import",
      reviewed_by_user_id: null,
      reviewed_at: new Date().toISOString(),
      review_notes: "HYROX official partner finder import",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase submission insert failed: ${response.status} ${await response.text()}`
    );
  }
}

function buildChangedFields(existing, nextRow) {
  const changed = {};

  for (const [key, value] of Object.entries(nextRow)) {
    if (
      key === "data_source" ||
      key === "created_at" ||
      key === "updated_at" ||
      key === "last_reported_at"
    ) {
      continue;
    }
    if (!existing || JSON.stringify(existing[key]) !== JSON.stringify(value)) {
      changed[key] = value;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}

function isLikelySamePlace(existing, row) {
  const distance = distanceKm(existing.lat, existing.lng, row.lat, row.lng);
  if (distance > 0.08) return false;

  const nameOverlap = tokenOverlap(normalizeName(existing.name), normalizeName(row.name));
  const addressOverlap = tokenOverlap(
    normalizeAddress(existing.address),
    normalizeAddress(row.address)
  );

  return nameOverlap >= 0.4 || addressOverlap >= 0.35;
}

function tokenOverlap(a, b) {
  const aTokens = new Set(a.split(" ").filter((token) => token.length >= 3));
  const bTokens = new Set(b.split(" ").filter((token) => token.length >= 3));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let matches = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) matches += 1;
  }
  return matches / Math.min(aTokens.size, bTokens.size);
}

function distanceKm(originLat, originLng, targetLat, targetLng) {
  if (
    originLat === null ||
    originLng === null ||
    targetLat === null ||
    targetLng === null ||
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(targetLat) ||
    !Number.isFinite(targetLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function inferDistrictCode(text) {
  const normalized = normalizeText(text);
  const rules = [
    ["HK-CW", ["central", "sheung wan", "sai ying pun", "sai wan", "shek tong tsui", "kennedy town", "pok fu lam", "des voeux", "hollywood road", "possession st", "li yuen", "lyndhurst", "pottinger", "pedder", "belcher", "queen's road west", "south ln"]],
    ["HK-WC", ["wan chai", "wanchai", "causeway bay", "happy valley", "admiralty", "fortress hill", "lockhart", "watson road", "tang lung", "pennington", "sports road", "queen's road east"]],
    ["HK-EA", ["north point", "quarry bay", "taikoo", "taikoo shing", "taikooplace", "tak koo shing", "king's road", "westland", "eastern centre"]],
    ["HK-SO", ["wong chuk hang", "repulse bay", "heung yip", "beach road"]],
    ["HK-YTM", ["mong kok", "tsim sha tsui", "tst", "jordan", "austin", "nathan road", "kowloon park", "hillwood", "hollywood plaza", "k11 musea", "yue hwa"]],
    ["HK-SSP", ["sham shui po", "cheung sha wan", "lai chi kok", "tonkin", "wing hong", "king lam", "kimberland", "burlington"]],
    ["HK-KC", ["kowloon city", "hung hom", "ho man tin", "to kwa wan", "kai tak", "airside", "concorde"]],
    ["HK-KT", ["kwun tong", "kowloon bay", "ngau tau kok", "mega box", "megabox", "telford", "amoy", "hoi yuen", "how ming", "lai yip", "hung to", "westin centre", "kwun tong road"]],
    ["HK-KTQ", ["kwai chung", "kwai tsing", "container port road"]],
    ["HK-TW", ["tsuen wan", "kolour", "castle peak road"]],
    ["HK-TM", ["tuen mun", "lung mun"]],
    ["HK-N", ["fanling", "san wan"]],
    ["HK-ST", ["sha tin", "shatin", "citylink", "lek yuen"]],
    ["HK-SK", ["sai kung", "hang hau", "tko", "clear water bay", "mostown", "ma on shan", "mount pavilia", "wai man", "yip wong"]],
    ["HK-YL", ["tin shui wai", "yuen long"]],
  ];

  for (const [code, keywords] of rules) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return code;
  }

  return null;
}

function buildSlug(parts) {
  const value = parts.filter(Boolean).join(" ");
  return normalizeText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value) {
  return normalizeText(value)
    .replace(/\b(hong kong|hk|fitness|gym|training|club|studio)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAddress(value) {
  return normalizeText(value)
    .replace(/\b(hong kong|hk|china|floor|level|shop|unit|room|address)\b/g, " ")
    .replace(/\b(f|fl|g|b)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function decodeHtml(value) {
  if (!value) return value;
  return value
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeUrl(value) {
  const url = getString(value);
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
