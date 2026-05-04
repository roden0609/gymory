#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the Snap Fitness Hong Kong location API.
 *
 * Snap Fitness exposes public location metadata, contact details, and
 * coordinates through its location finder endpoint. It does not expose
 * structured equipment inventory, so this importer explicitly writes all
 * equipment fields as null.
 *
 * Usage:
 *   node scripts/import-snap-fitness-hk.mjs
 *   node scripts/import-snap-fitness-hk.mjs --out data/imports/snap-fitness-hk.json
 *   node scripts/import-snap-fitness-hk.mjs --details-out data/imports/raw-snap-fitness-hk-details.json
 *   node scripts/import-snap-fitness-hk.mjs --details-file data/imports/raw-snap-fitness-hk-details.json
 *   node scripts/import-snap-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const ORIGIN = "https://www.snapfitness.com";
const LIST_URL_ZH = `${ORIGIN}/hk/api/location-finder-edge`;
const LIST_URL_EN = `${ORIGIN}/hk_en/api/location-finder-edge`;
const SOURCE_URL = `${ORIGIN}/hk_en/gyms`;
const SNAP_OPENING_HOURS = {
  friday: "00:00-24:00",
  monday: "00:00-24:00",
  sunday: "00:00-24:00",
  tuesday: "00:00-24:00",
  saturday: "00:00-24:00",
  thursday: "00:00-24:00",
  wednesday: "00:00-24:00",
  public_holidays: "00:00-24:00",
};
const BRANCH_NAME_ZH_BY_LOCATION_NUM = {
  "2058": "灣仔",
  "2087": "西灣河",
  "2133": "太子",
  "2140": "土瓜灣",
  "2145": "大埔",
  "2165": "天后",
  "2179": "九龍灣",
  "2180": "沙田",
  "2181": "鰂魚涌",
  "2598": "觀塘",
  "2629": "美孚",
  "2649": "新蒲崗",
  "2689": "何文田",
  "2700": "薄扶林",
  "2728": "長沙灣",
  "2741": "葵興",
  "2788": "北角",
  "2858": "尖沙咀",
  "2896": "將軍澳",
  "2926": "荃灣",
  "2960": "紅磡",
  "2968": "上環",
  "2978": "柴灣",
  "2986": "粉嶺",
  "3001": "中環",
  "3008": "西環",
  "3055": "杏花邨",
};
const BRANCH_NAME_ZH_BY_SLUG = Object.fromEntries(
  Object.entries({
    "chai-wan": "柴灣",
    "central-hk": "中環",
    "cheung-sha-wan": "長沙灣",
    fanling: "粉嶺",
    "heng-fachuen": "杏花邨",
    "ho-man-tin": "何文田",
    "hung-hom": "紅磡",
    "kowloon-bay": "九龍灣",
    "kwai-hing": "葵興",
    "kwun-tong": "觀塘",
    "mei-foo": "美孚",
    "north-point": "北角",
    "pok-fulam": "薄扶林",
    "prince-edward": "太子",
    "quarry-bay": "鰂魚涌",
    "sai-wan": "西環",
    "sai-wan-ho": "西灣河",
    "san-po-kong": "新蒲崗",
    "sha-tin": "沙田",
    "sheung-wan": "上環",
    "tai-po": "大埔",
    "tin-hau": "天后",
    "to-kwa-wan": "土瓜灣",
    "tseung-kwan-o": "將軍澳",
    "tsim-sha-tsui": "尖沙咀",
    "tsuen-wan": "荃灣",
    "wan-chai": "灣仔",
  }).map(([slug, name]) => [`/gyms/${slug}`, name])
);

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
    : await fetchLocationDetailsFromApi();

  if (args["details-out"]) {
    const detailsOutPath = path.resolve(process.cwd(), args["details-out"]);
    await mkdir(path.dirname(detailsOutPath), { recursive: true });
    await writeFile(detailsOutPath, `${JSON.stringify(details, null, 2)}\n`);
    console.log(`Wrote ${details.length} Snap Fitness detail snapshots to ${detailsOutPath}`);
  }

  const rows = details
    .map((detail) => mapLocationToGymRow(detail, districtOverrides))
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
        "Add overrides with --district-overrides <json>. Keys can be location numbers, Glofox IDs, URLs, or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/snap-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} Snap Fitness HK baseline rows to ${outPath}`);

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

async function fetchLocationDetailsFromApi() {
  const [enPayload, zhPayload] = await Promise.all([
    fetchLocationPayload(LIST_URL_EN),
    fetchLocationPayload(LIST_URL_ZH),
  ]);
  return mergeLocalizedLocations(enPayload.items, zhPayload.items);
}

async function fetchLocationPayload(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
      Accept: "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status} ${text.slice(0, 300)}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 300)}`);
  }

  if (!Array.isArray(payload?.items)) {
    throw new Error(`Could not find items array in Snap Fitness response from ${url}`);
  }
  return payload;
}

function mergeLocalizedLocations(enItems, zhItems) {
  const zhByKey = new Map();
  for (const item of zhItems) {
    zhByKey.set(getLocationKey(item), item);
  }

  const merged = [];
  for (const enItem of enItems) {
    const key = getLocationKey(enItem);
    const zhItem = zhByKey.get(key);
    merged.push(normalizeLocationDetail(enItem, zhItem));
    zhByKey.delete(key);
  }

  for (const zhItem of zhByKey.values()) {
    merged.push(normalizeLocationDetail(null, zhItem));
  }

  return args.limit ? merged.slice(0, Number(args.limit)) : merged;
}

function getLocationKey(item) {
  return (
    getString(item?.customProperties?.locationNum) ??
    getString(item?.customProperties?.glofoxId) ??
    getString(item?.urlPath) ??
    String(item?.id ?? "")
  );
}

function normalizeLocationDetail(enItem, zhItem) {
  const item = enItem ?? zhItem;
  const enContact = enItem?.customProperties?.contactDetails ?? {};
  const zhContact = zhItem?.customProperties?.contactDetails ?? {};
  const contact = item?.customProperties?.contactDetails ?? {};
  const [addressEn, addressZhFromEn] = splitLocalizedAddress(enContact.address);
  const [addressFromZhPage, addressZh] = splitLocalizedAddress(zhContact.address);

  return {
    id: item?.id ?? null,
    id_en: enItem?.id ?? null,
    id_zh: zhItem?.id ?? null,
    name: getString(enItem?.name) ?? getString(zhItem?.name),
    name_zh: containsCjk(zhItem?.name) ? getString(zhItem?.name) : null,
    url_path: getString(enItem?.urlPath) ?? getString(zhItem?.urlPath),
    location_num: getString(item?.customProperties?.locationNum),
    glofox_id: getString(item?.customProperties?.glofoxId),
    gym_sales_id: getString(item?.customProperties?.gymSalesId),
    address: normalizeAddress(addressEn ?? addressFromZhPage ?? contact.address),
    address_zh: normalizeAddress(addressZh ?? addressZhFromEn),
    city: getString(enContact.city) ?? getString(zhContact.city),
    phone: getString(enContact.phone) ?? getString(zhContact.phone),
    email: getString(enContact.email) ?? getString(zhContact.email),
    open_24_hours:
      getString(enContact.open24Hours) ?? getString(zhContact.open24Hours) ?? null,
    latitude: getString(item?.customProperties?.latitude),
    longitude: getString(item?.customProperties?.longitude),
  };
}

function splitLocalizedAddress(value) {
  const address = getString(value);
  if (!address) return [null, null];

  const [first, ...rest] = address.split("|").map((part) => part.trim()).filter(Boolean);
  const second = rest.join(" | ").trim() || null;

  if (containsCjk(first) && second && !containsCjk(second)) return [second, first];
  return [first ?? null, containsCjk(second) ? second : containsCjk(first) ? first : null];
}

function mapLocationToGymRow(detail, districtOverrides) {
  const baseName = cleanBranchName(detail.name);
  const baseNameZh = resolveBranchNameZh(detail);
  const slug = toSlug(
    ["snap-fitness", baseName, detail.location_num ?? detail.glofox_id ?? detail.id]
      .filter(Boolean)
      .join(" ")
  );
  const websiteUrl = detail.url_path ? `${ORIGIN}/hk_en${detail.url_path}` : SOURCE_URL;
  const districtText = [
    baseName,
    detail.name_zh,
    detail.city,
    detail.address,
    detail.address_zh,
    detail.url_path,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name: `Snap Fitness ${baseName}`,
    name_zh: baseNameZh ? `Snap Fitness ${baseNameZh}` : null,
    slug,
    address: detail.address,
    address_zh: detail.address_zh,
    district_code:
      districtOverrides[detail.location_num] ??
      districtOverrides[detail.glofox_id] ??
      districtOverrides[websiteUrl] ??
      districtOverrides[slug] ??
      inferDistrictCode(districtText),
    country_code: "HK",
    website_url: websiteUrl,
    contact_phone: normalizePhone(detail.phone),
    opening_hours_json: { ...SNAP_OPENING_HOURS },
    lat: toNumber(detail.latitude),
    lng: toNumber(detail.longitude),
    is_active: true,
    data_source: "import",
    last_reported_at: new Date().toISOString(),
    ...buildNullEquipmentFields(),
    has_washroom: true,
    has_bathroom: true,
  };
}

function resolveBranchNameZh(detail) {
  return (
    BRANCH_NAME_ZH_BY_LOCATION_NUM[detail.location_num] ??
    BRANCH_NAME_ZH_BY_SLUG[detail.url_path] ??
    detail.name_zh ??
    null
  );
}

function cleanBranchName(value) {
  const name = getString(value);
  if (!name) return "Hong Kong";
  return name
    .replace(/^Snap\s+Fitness\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNullEquipmentFields() {
  const fields = [
    "rack_count",
    "bench_count",
    "barbell_count",
    "platform_count",
    "dumbbell_max_weight_kg",
    "plate_min_weight_kg",
    "plate_max_weight_kg",
    "has_roman_chair",
    "has_trap_bar",
    "has_safety_squat_bar",
    "has_farmer_handles",
    "has_landmine_attachment",
    "has_swiss_bar",
    "has_cambered_bar",
    "has_ez_bar",
    "treadmill_count",
    "assault_bike_count",
    "exercise_bike_count",
    "climber_count",
    "assault_runner_count",
    "ski_erg_count",
    "rower_count",
    "sled_count",
    "has_wall_ball",
    "wall_ball_count",
    "wall_ball_4kg_count",
    "wall_ball_6kg_count",
    "wall_ball_9kg_count",
    "wall_ball_plate_9ft_count",
    "wall_ball_plate_10ft_count",
    "has_workout_sandbag",
    "has_boxing_sandbag",
    "sandbag_10kg_count",
    "sandbag_20kg_count",
    "sandbag_30kg_count",
    "has_kettlebell",
    "kettlebell_16kg_count",
    "kettlebell_24kg_count",
    "kettlebell_32kg_count",
    "cable_machine_count",
    "has_lat_pulldown_cable",
    "has_seated_row_cable",
    "lat_pulldown_count",
    "chest_press_count",
    "leg_press_count",
    "has_hack_squat",
    "smith_machine_count",
    "has_smith_machine",
    "has_deadlift_platform",
    "has_pull_up_bar",
    "has_dip_station",
    "has_trx",
    "has_resistance_band",
    "has_battle_ropes",
    "has_rings",
    "has_glute_ham_developer",
    "has_reverse_hyper",
    "has_farmers_handles",
    "has_bicep_curl_machine",
    "has_tricep_extension_machine",
    "has_chest_press_machine",
    "has_incline_chest_press_machine",
    "has_iso_lateral_chest_press_machine",
    "has_pec_deck_machine",
    "has_chest_fly_machine",
    "has_lat_pulldown_machine",
    "has_seated_row_machine",
    "has_back_extension_machine",
    "has_iso_lateral_row_machine",
    "has_t_bar_row_machine",
    "has_lateral_raise_machine",
    "has_reverse_fly_machine",
    "has_shoulder_press_machine",
    "has_iso_lateral_shoulder_press_machine",
    "has_hip_abductor_machine",
    "has_hip_adductor_machine",
    "has_leg_extension_machine",
    "has_leg_press_machine",
    "has_seated_leg_press_machine",
    "has_lying_leg_curl_machine",
    "has_seated_leg_curl_machine",
    "has_seated_calf_raise_machine",
    "has_squat_machine",
    "has_standing_calf_raise_machine",
    "has_battle_rope",
    "has_foam_roller",
    "has_medicine_ball",
    "has_dip_belt",
    "has_weight_vest",
    "has_lifting_straps",
    "has_plyo_box",
    "has_balance_ball",
    "has_washroom",
    "has_bathroom",
    "has_yoga_block",
    "has_yoga_mat",
    "equipment_notes",
    "equipment_last_verified_at",
  ];

  return Object.fromEntries(fields.map((field) => [field, null]));
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
  { code: "HK-EA", keywords: ["北角", "鰂魚涌", "太古", "西灣河", "筲箕灣", "柴灣", "小西灣", "杏花邨", "炮台山", "天后", "north point", "quarry bay", "taikoo", "sai wan ho", "shau kei wan", "chai wan", "siu sai wan", "heng fa chuen", "fortress hill", "tin hau"] },
  { code: "HK-SO", keywords: ["香港仔", "黃竹坑", "鴨脷洲", "赤柱", "淺水灣", "薄扶林", "aberdeen", "wong chuk hang", "ap lei chau", "stanley", "repulse bay", "pok fu lam"] },
  { code: "HK-KTQ", keywords: ["葵涌", "葵芳", "葵興", "青衣", "荔景", "kwai chung", "kwai fong", "kwai hing", "tsing yi", "lai king"] },
  { code: "HK-TW", keywords: ["荃灣", "汀九", "深井", "珀麗灣", "馬灣", "tsuen wan", "ting kau", "sham tseng", "park island", "ma wan"] },
  { code: "HK-TM", keywords: ["屯門", "tuen mun"] },
  { code: "HK-YL", keywords: ["元朗", "天水圍", "yoho", "yuen long", "tin shui wai"] },
  { code: "HK-N", keywords: ["上水", "粉嶺", "sheung shui", "fanling"] },
  { code: "HK-TP", keywords: ["大埔", "太和", "tai po", "tai wo"] },
  { code: "HK-ST", keywords: ["沙田", "大圍", "馬鞍山", "火炭", "石門", "科學園", "sha tin", "shatin", "tai wai", "ma on shan", "fo tan", "shek mun", "science park"] },
  { code: "HK-SK", keywords: ["將軍澳", "西貢", "坑口", "寶琳", "調景嶺", "tseung kwan o", "sai kung", "hang hau", "po lam", "tiu keng leng"] },
  { code: "HK-IS", keywords: ["東涌", "離島", "愉景灣", "長洲", "梅窩", "tung chung", "islands", "discovery bay", "cheung chau", "mui wo"] },
];

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function containsCjk(value) {
  return typeof value === "string" && /[\u3400-\u9fff]/.test(value);
}

function normalizeAddress(value) {
  const address = getString(value);
  if (!address) return null;

  return address
    .replace(/\s*\n\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,+/g, ",")
    .replace(/\bHong Kong,\s*Hong Kong\b/i, "Hong Kong")
    .replace(/\bKowloon,\s*Kowloon\b/i, "Kowloon")
    .trim();
}

function normalizePhone(value) {
  const phone = getString(value);
  return phone?.replace(/[^\d+]/g, "") ?? null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  const details = JSON.parse(raw);
  if (!Array.isArray(details)) {
    throw new Error(`Expected array of Snap Fitness detail objects in ${filePath}`);
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
