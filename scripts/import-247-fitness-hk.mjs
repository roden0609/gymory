#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the 24/7 Fitness Hong Kong store API.
 *
 * The 24/7 Fitness API exposes location/contact metadata, but not equipment
 * inventory. This importer explicitly writes all equipment fields as null so
 * missing upstream data does not get coerced into zero / false defaults.
 *
 * Usage:
 *   node scripts/import-247-fitness-hk.mjs
 *   node scripts/import-247-fitness-hk.mjs --out data/imports/247-fitness-hk.json
 *   node scripts/import-247-fitness-hk.mjs --details-file raw-247-details.json
 *   node scripts/import-247-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles([".env.local", "apps/web/.env.local"]);

const LIST_URL = "https://247.fitness/app-api/cms/store/?lang=zh-hk";
const DETAIL_URL =
  "https://247.fitness/app-api/cms/store/global/detail?lang=zh-hk&countryCode=HK&storeId=";
const SOURCE_URL = "https://247.fitness/zh-hk/contact_us/stores";

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const districtOverrides = args["district-overrides"]
    ? await loadDistrictOverrides(args["district-overrides"])
    : {};

  const details = args["details-file"]
    ? await loadDetailsFile(args["details-file"])
    : await fetchStoreDetailsFromApi();

  const rows = details
    .map((detail) => mapStoreToGymRow(detail, districtOverrides))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const unknownDistricts = rows.filter((row) => !row.district_code);
  if (unknownDistricts.length > 0) {
    const examples = unknownDistricts
      .slice(0, 10)
      .map((row) => `- ${row.slug}: ${row.address_zh ?? row.address ?? "no address"}`)
      .join("\n");
    throw new Error(
      [
        `Could not infer district_code for ${unknownDistricts.length} gyms.`,
        "Add overrides with --district-overrides <json>. Keys can be store IDs or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/247-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} 24/7 Fitness HK baseline rows to ${outPath}`);

  if (args.upsert) {
    await upsertRows(rows);
    console.log(`Upserted ${rows.length} rows into Supabase gyms on slug`);
  } else {
    console.log("Dry run only. Pass --upsert to write to Supabase.");
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "tenant-id": "1",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status} ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 300)}`);
  }
}

async function fetchStoreList() {
  const payload = await fetchJson(LIST_URL);
  const countryNodes = payload?.data?.countryNodes;
  if (!Array.isArray(countryNodes)) {
    throw new Error("Could not find countryNodes in 24/7 Fitness list response");
  }

  const hkNode = countryNodes.find((country) => country?.countryCode === "HK");
  const areaNodes = hkNode?.areaNodeList;
  if (!Array.isArray(areaNodes)) {
    throw new Error("Could not find Hong Kong areaNodeList in 24/7 Fitness list response");
  }

  const stores = areaNodes.flatMap((area) =>
    Array.isArray(area?.stores) ? area.stores : []
  );
  if (stores.length === 0) {
    throw new Error("Could not find store array in 24/7 Fitness list response");
  }
  return stores;
}

async function fetchStoreDetail(storeId) {
  const payload = await fetchJson(`${DETAIL_URL}${encodeURIComponent(storeId)}`);
  return findObject(payload, (item) => getStoreId(item) === storeId) ?? payload?.data ?? payload;
}

function mapStoreToGymRow(detail, districtOverrides) {
  const storeId = getStoreId(detail);
  const names = splitLocalized(detail.storeName ?? detail.name ?? detail.store_name);
  const addresses = splitLocalized(detail.address ?? detail.storeAddress ?? detail.store_address);
  const name = names.en ?? names.zh ?? `24/7 Fitness ${storeId}`;
  const nameZh = names.zh ?? null;
  const address = addresses.en ?? addresses.zh ?? null;
  const addressZh = addresses.zh ?? null;
  const slug = toSlug(["24-7-fitness", name, storeId].filter(Boolean).join(" "));
  const lat = toNumber(detail.latitude ?? detail.lat);
  const lng = toNumber(detail.longitude ?? detail.lng ?? detail.lon);
  const status = toNumber(detail.status);

  return {
    name: `24/7 Fitness ${name}`,
    name_zh: nameZh ? `24/7 Fitness ${nameZh}` : null,
    slug,
    address,
    address_zh: addressZh,
    district_code:
      districtOverrides[String(storeId)] ??
      districtOverrides[slug] ??
      inferDistrictCode([name, nameZh, address, addressZh].filter(Boolean).join(" ")),
    country_code: "HK",
    website_url: SOURCE_URL,
    contact_phone: normalizePhone(detail.mobile ?? detail.phone ?? detail.tel),
    lat,
    lng,
    is_active: status === null ? true : status === 1,
    data_source: "import",
    last_reported_at: new Date().toISOString(),
    ...buildNullEquipmentFields(),
  };
}

function buildNullEquipmentFields() {
  return {
    rack_count: null,
    bench_count: null,
    barbell_count: null,
    platform_count: null,
    dumbbell_max_weight_kg: null,
    plate_min_weight_kg: null,
    plate_max_weight_kg: null,
    has_roman_chair: null,
    has_trap_bar: null,
    has_safety_squat_bar: null,
    has_farmer_handles: null,
    has_landmine_attachment: null,
    has_swiss_bar: null,
    has_cambered_bar: null,
    has_ez_bar: null,
    treadmill_count: null,
    assault_bike_count: null,
    exercise_bike_count: null,
    climber_count: null,
    assault_runner_count: null,
    ski_erg_count: null,
    rower_count: null,
    sled_count: null,
    has_wall_ball: null,
    wall_ball_count: null,
    wall_ball_4kg_count: null,
    wall_ball_6kg_count: null,
    wall_ball_9kg_count: null,
    wall_ball_plate_9ft_count: null,
    wall_ball_plate_10ft_count: null,
    has_sandbag: null,
    sandbag_10kg_count: null,
    sandbag_20kg_count: null,
    sandbag_30kg_count: null,
    has_kettlebell: null,
    kettlebell_16kg_count: null,
    kettlebell_24kg_count: null,
    kettlebell_32kg_count: null,
    cable_machine_count: null,
    has_lat_pulldown_cable: null,
    has_seated_row_cable: null,
    lat_pulldown_count: null,
    chest_press_count: null,
    leg_press_count: null,
    hack_squat_count: null,
    smith_machine_count: null,
    has_smith_machine: null,
    has_deadlift_platform: null,
    has_pull_up_bar: null,
    has_dip_station: null,
    has_trx: null,
    has_resistance_band: null,
    has_battle_ropes: null,
    has_rings: null,
    has_glute_ham_developer: null,
    has_reverse_hyper: null,
    has_farmers_handles: null,
    has_bicep_curl_machine: null,
    has_tricep_extension_machine: null,
    has_chest_press_machine: null,
    has_incline_chest_press_machine: null,
    has_iso_lateral_chest_press_machine: null,
    has_pec_deck_machine: null,
    has_chest_fly_machine: null,
    has_lat_pulldown_machine: null,
    has_seated_row_machine: null,
    has_back_extension_machine: null,
    has_iso_lateral_row_machine: null,
    has_t_bar_row_machine: null,
    has_lateral_raise_machine: null,
    has_reverse_fly_machine: null,
    has_shoulder_press_machine: null,
    has_iso_lateral_shoulder_press_machine: null,
    has_hip_abductor_machine: null,
    has_hip_adductor_machine: null,
    has_leg_extension_machine: null,
    has_leg_press_machine: null,
    has_seated_leg_press_machine: null,
    has_lying_leg_curl_machine: null,
    has_seated_leg_curl_machine: null,
    has_seated_calf_raise_machine: null,
    has_squat_machine: null,
    has_standing_calf_raise_machine: null,
    has_battle_rope: null,
    has_foam_roller: null,
    has_medicine_ball: null,
    has_dip_belt: null,
    has_weight_vest: null,
    has_lifting_straps: null,
    has_plyo_box: null,
    has_balance_ball: null,
    equipment_notes: null,
    equipment_last_verified_at: null,
  };
}

async function fetchStoreDetailsFromApi() {
  const stores = await fetchStoreList();
  const limitedStores = args.limit ? stores.slice(0, Number(args.limit)) : stores;
  const details = [];

  for (const store of limitedStores) {
    const storeId = getStoreId(store);
    if (!storeId) continue;
    details.push(await fetchStoreDetail(storeId));
  }

  return details;
}

function splitLocalized(value) {
  const parts = getString(value)
    ?.split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts || parts.length === 0) return { zh: null, en: null, zhHans: null };
  return {
    zh: parts[0] ?? null,
    en: parts[1] ?? parts[0] ?? null,
    zhHans: parts[2] ?? null,
  };
}

function inferDistrictCode(text) {
  const haystack = text.toLowerCase();
  const match = DISTRICT_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
  );
  return match?.code ?? null;
}

const DISTRICT_KEYWORDS = [
  { code: "HK-YTM", keywords: ["油麻地", "尖沙咀", "旺角", "佐敦", "大角咀", "太子", "yau ma tei", "tsim sha tsui", "mong kok", "mongkok", "jordan", "tai kok tsui", "prince edward"] },
  { code: "HK-SSP", keywords: ["深水埗", "長沙灣", "荔枝角", "美孚", "石硤尾", "南昌", "sham shui po", "cheung sha wan", "lai chi kok", "mei foo", "shek kip mei", "nam cheong"] },
  { code: "HK-KC", keywords: ["九龍城", "紅磡", "土瓜灣", "何文田", "啟德", "九龍塘", "又一城", "hung hom", "to kwa wan", "ho man tin", "kai tak", "kowloon city", "kowloon tong", "festival walk"] },
  { code: "HK-WTS", keywords: ["黃大仙", "鑽石山", "新蒲崗", "樂富", "慈雲山", "wong tai sin", "diamond hill", "san po kong", "lok fu", "tsz wan shan"] },
  { code: "HK-KT", keywords: ["觀塘", "牛頭角", "九龍灣", "藍田", "油塘", "秀茂坪", "kwun tong", "ngau tau kok", "kowloon bay", "lam tin", "yau tong", "sau mau ping"] },
  { code: "HK-CW", keywords: ["中環", "上環", "西環", "西營盤", "堅尼地城", "金鐘", "半山", "central", "sheung wan", "sai wan", "sai ying pun", "kennedy town", "admiralty", "mid-levels"] },
  { code: "HK-WC", keywords: ["灣仔", "銅鑼灣", "跑馬地", "大坑", "wan chai", "causeway bay", "happy valley", "tai hang"] },
  { code: "HK-EA", keywords: ["北角", "鰂魚涌", "太古", "西灣河", "筲箕灣", "柴灣", "小西灣", "炮台山", "天后", "north point", "quarry bay", "taikoo", "sai wan ho", "shau kei wan", "chai wan", "siu sai wan", "fortress hill", "tin hau"] },
  { code: "HK-SO", keywords: ["香港仔", "黃竹坑", "鴨脷洲", "赤柱", "淺水灣", "薄扶林", "aberdeen", "wong chuk hang", "ap lei chau", "stanley", "repulse bay", "pok fu lam"] },
  { code: "HK-KTQ", keywords: ["葵涌", "葵芳", "青衣", "荔景", "kwai chung", "kwai fong", "tsing yi", "lai king"] },
  { code: "HK-TW", keywords: ["荃灣", "汀九", "深井", "珀麗灣", "馬灣", "tsuen wan", "ting kau", "sham tseng", "park island", "ma wan"] },
  { code: "HK-TM", keywords: ["屯門", "tuen mun"] },
  { code: "HK-YL", keywords: ["元朗", "天水圍", "yoho", "yuen long", "tin shui wai"] },
  { code: "HK-N", keywords: ["上水", "粉嶺", "sheung shui", "fanling"] },
  { code: "HK-TP", keywords: ["大埔", "太和", "tai po", "tai wo"] },
  { code: "HK-ST", keywords: ["沙田", "大圍", "馬鞍山", "火炭", "石門", "科學園", "sha tin", "shatin", "tai wai", "ma on shan", "fo tan", "shek mun", "science park"] },
  { code: "HK-SK", keywords: ["將軍澳", "西貢", "坑口", "寶琳", "調景嶺", "tseung kwan o", "sai kung", "hang hau", "po lam", "tiu keng leng"] },
  { code: "HK-IS", keywords: ["東涌", "離島", "愉景灣", "長洲", "梅窩", "tung chung", "islands", "discovery bay", "cheung chau", "mui wo"] },
];

function findArray(value, predicate) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "object" && item && predicate(item))
      ? value
      : null;
  }
  if (!value || typeof value !== "object") return null;
  for (const child of Object.values(value)) {
    const found = findArray(child, predicate);
    if (found) return found;
  }
  return null;
}

function findObject(value, predicate) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (predicate(value)) return value;
  for (const child of Object.values(value)) {
    const found = findObject(child, predicate);
    if (found) return found;
  }
  return null;
}

function getStoreId(store) {
  const id = store?.storeId ?? store?.store_id ?? store?.id;
  if (id === null || id === undefined || id === "") return null;
  return String(id);
}

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePhone(value) {
  const phone = getString(value);
  return phone?.replace(/\s+/g, "") ?? null;
}

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadDistrictOverrides(filePath) {
  const raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
  const overrides = JSON.parse(raw);
  for (const [key, value] of Object.entries(overrides)) {
    if (!/^HK-[A-Z]+$/.test(value)) {
      throw new Error(`Invalid district override for ${key}: ${value}`);
    }
  }
  return overrides;
}

async function loadDetailsFile(filePath) {
  const raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
  const payload = JSON.parse(raw);
  const details = findArray(payload, (item) => getStoreId(item) !== null);
  if (!details) {
    throw new Error(`Could not find detail objects with storeId in ${filePath}`);
  }
  return args.limit ? details.slice(0, Number(args.limit)) : details;
}

async function upsertRows(rows) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !apiKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for --upsert");
  }

  await upsertGymsWithSubmissions({
    rows,
    actorType: "import",
    supabaseUrl,
    apiKey,
  });
}
