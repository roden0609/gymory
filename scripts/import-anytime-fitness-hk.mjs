#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the Anytime Fitness Hong Kong map API.
 *
 * Anytime Fitness exposes public location metadata through its WordPress map
 * endpoint. The endpoint includes branch names, addresses, phone numbers,
 * emails, coordinates, and active/opening status. It does not expose structured
 * equipment inventory, so this importer explicitly writes all equipment fields
 * as null.
 *
 * Usage:
 *   node scripts/import-anytime-fitness-hk.mjs
 *   node scripts/import-anytime-fitness-hk.mjs --out data/imports/anytime-fitness-hk.json
 *   node scripts/import-anytime-fitness-hk.mjs --details-out data/imports/raw-anytime-fitness-hk-details.json
 *   node scripts/import-anytime-fitness-hk.mjs --details-file data/imports/raw-anytime-fitness-hk-details.json
 *   node scripts/import-anytime-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const API_URL = "https://www.anytimefitness.hk/wp-json/anytime/v1/map-locations";
const SOURCE_URL = "https://www.anytimefitness.hk/locations/hk/hong%20kong%20island/";
const ANYTIME_OPENING_HOURS = {
  friday: "00:00-24:00",
  monday: "00:00-24:00",
  sunday: "00:00-24:00",
  tuesday: "00:00-24:00",
  saturday: "00:00-24:00",
  thursday: "00:00-24:00",
  wednesday: "00:00-24:00",
  public_holidays: "00:00-24:00",
};

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
    console.log(`Wrote ${details.length} Anytime Fitness detail snapshots to ${detailsOutPath}`);
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
        "Add overrides with --district-overrides <json>. Keys can be club numbers, URLs, or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/anytime-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} Anytime Fitness HK baseline rows to ${outPath}`);

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
    if (arg === "--") continue;
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
  const response = await fetch(API_URL, {
    headers: {
      "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
      Accept: "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed ${API_URL}: ${response.status} ${text.slice(0, 300)}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${API_URL}, got: ${text.slice(0, 300)}`);
  }

  if (!Array.isArray(payload)) {
    throw new Error("Could not find location array in Anytime Fitness response");
  }

  const details = payload.map(normalizeApiLocation).filter((detail) => detail.country_code === "HK");
  return args.limit ? details.slice(0, Number(args.limit)) : details;
}

function normalizeApiLocation(item) {
  const content = item?.content ?? {};
  const clubNumber = getString(content.number);
  const title = resolveBranchNameEn(clubNumber, cleanBranchName(content.title));
  const [address, addressZh] = splitLocalizedAddress(content.address, content.address2);

  return {
    title,
    title_zh: resolveBranchNameZh(clubNumber, title),
    club_number: clubNumber,
    address,
    address_zh: addressZh,
    city: getString(content.city),
    state: getString(content.state),
    country_code: getString(content.country),
    phone: getString(content.phone),
    email: getString(content.email),
    website_url: getString(content.url),
    status: toNumber(content.status),
    lat: toNumber(item.latitude),
    lng: toNumber(item.longitude),
  };
}

function splitLocalizedAddress(addressValue, address2Value) {
  const address = normalizeAddress(addressValue);
  const address2 = normalizeAddress(address2Value);

  if (containsCjk(address2)) {
    return [stripCjkSuffix(address), address2];
  }

  if (containsCjk(address)) {
    const split = splitMixedAddress(address);
    return [split.en, split.zh ?? (containsCjk(address2) ? address2 : null)];
  }

  return [address, containsCjk(address2) ? address2 : null];
}

function splitMixedAddress(value) {
  const address = getString(value);
  if (!address) return { en: null, zh: null };

  const match = address.match(/^(.*?)([\u3400-\u9fff].*)$/);
  if (!match) return { en: address, zh: null };

  const en = normalizeAddress(match[1].replace(/[,(（\s]+$/g, ""));
  const zh = normalizeAddress(match[2].replace(/[)）\s]+$/g, ""));
  return { en, zh };
}

function stripCjkSuffix(value) {
  const address = getString(value);
  if (!address || !containsCjk(address)) return address;
  return splitMixedAddress(address).en;
}

function mapLocationToGymRow(detail, districtOverrides) {
  const slug = toSlug(
    ["anytime-fitness", detail.title, detail.club_number].filter(Boolean).join(" ")
  );
  const districtText = [
    detail.title,
    detail.title_zh,
    detail.city,
    detail.state,
    detail.address,
    detail.address_zh,
    detail.website_url,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name: `Anytime Fitness ${detail.title}`,
    name_zh: detail.title_zh ? `Anytime Fitness ${detail.title_zh}` : null,
    slug,
    address: detail.address,
    address_zh: detail.address_zh,
    district_code:
      districtOverrides[detail.club_number] ??
      districtOverrides[detail.website_url] ??
      districtOverrides[slug] ??
      inferDistrictCode(districtText),
    country_code: "HK",
    website_url: detail.website_url ?? SOURCE_URL,
    contact_phone: normalizePhone(detail.phone),
    lat: detail.lat,
    lng: detail.lng,
    is_active: detail.status === 3,
    data_source: "import",
    last_reported_at: new Date().toISOString(),
    opening_hours_json: { ...ANYTIME_OPENING_HOURS },
    ...buildNullEquipmentFields(),
    has_washroom: true,
    has_bathroom: true,
  };
}

function cleanBranchName(value) {
  const name = getString(value);
  if (!name) return "Hong Kong";
  return name.replace(/\s*\(([^)]+)\)\s*$/g, "").replace(/\s+/g, " ").trim();
}

function resolveBranchNameZh(clubNumber, title) {
  return (
    BRANCH_NAME_ZH_BY_CLUB_NUMBER[clubNumber] ??
    BRANCH_NAME_ZH_BY_TITLE[cleanBranchName(title)] ??
    null
  );
}

function resolveBranchNameEn(clubNumber, title) {
  return BRANCH_NAME_EN_BY_CLUB_NUMBER[clubNumber] ?? title;
}

const BRANCH_NAME_EN_BY_CLUB_NUMBER = {
  "HK-0025": "Butterfly Plaza",
};

const BRANCH_NAME_ZH_BY_CLUB_NUMBER = {
  "HK-0002": "九龍城",
  "HK-0003": "西營盤",
  "HK-0004": "葵芳",
  "HK-0007": "觀塘",
  "HK-0008": "荃灣",
  "HK-0009": "土瓜灣",
  "HK-0012": "柴灣",
  "HK-0014": "葵興",
  "HK-0015": "佐敦",
  "HK-0017": "良景",
  "HK-0018": "元朗",
  "HK-0022": "北角",
  "HK-0023": "安定",
  "HK-0025": "蝴蝶廣場",
  "HK-0026": "鰂魚涌",
  "HK-0027": "荔枝角",
  "HK-0028": "西灣河",
  "HK-0029": "慈雲山",
  "HK-0030": "青衣",
  "HK-0031": "炮台山",
  "HK-0032": "何文田",
  "HK-0033": "旺角",
  "HK-0034": "恆安",
  "HK-0035": "深水埗",
  "HK-0036": "粉嶺",
  "HK-0037": "紅磡",
  "HK-0038": "灣仔",
  "HK-0039": "將軍澳",
  "HK-0040": "安蔭",
  "HK-0042": "太子",
  "HK-0043": "悅來坊",
  "HK-0044": "景林",
  "HK-0045": "彩雲",
  "HK-0046": "尖沙咀",
  "HK-0047": "坑口",
  "HK-0048": "黃大仙",
  "HK-0049": "耀安商場",
  "HK-0050": "天水圍",
  "HK-0053": "黃埔",
  "HK-0054": "西環",
};

const BRANCH_NAME_ZH_BY_TITLE = {
  Butterfly: "蝴蝶",
  "Chai Wan": "柴灣",
  "Choi Wan": "彩雲",
  Fanling: "粉嶺",
  "Fortress Hill": "炮台山",
  "Hang Hau": "坑口",
  "Heng On": "恆安",
  "Ho Man Tin": "何文田",
  "Hung Hom": "紅磡",
  Jordan: "佐敦",
  "King Lam": "景林",
  "Kowloon City": "九龍城",
  "Kwai Fong": "葵芳",
  "Kwai Hing": "葵興",
  "Kwun Tong": "觀塘",
  "Lai Chi Kok": "荔枝角",
  "Leung King": "良景",
  "Mong Kok": "旺角",
  "North Point": "北角",
  "On Ting": "安定",
  "On Yam": "安蔭",
  "Panda Place": "悅來坊",
  "Prince Edward": "太子",
  "Quarry Bay": "鰂魚涌",
  "Sai Wan": "西環",
  "Sai Wan Ho": "西灣河",
  "Sai Ying Pun": "西營盤",
  "Sham Shui Po": "深水埗",
  "Tin Shui Wai": "天水圍",
  "To Kwa Wan": "土瓜灣",
  "Tseung Kwan O": "將軍澳",
  "Tsim Sha Tsui": "尖沙咀",
  "Tsing Yi": "青衣",
  "Tsuen Wan": "荃灣",
  "Tsz Wan Shan": "慈雲山",
  "Wan Chai": "灣仔",
  Whampoa: "黃埔",
  "Wong Tai Sin": "黃大仙",
  "Yiu On Shopping Centre": "耀安商場",
  "Yuen Long": "元朗",
};

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
  { code: "HK-KC", keywords: ["九龍城", "紅磡", "土瓜灣", "何文田", "啟德", "九龍塘", "又一城", "黃埔", "hung hom", "to kwa wan", "ho man tin", "kai tak", "kowloon city", "kowloon tong", "festival walk", "whampoa"] },
  { code: "HK-WTS", keywords: ["黃大仙", "鑽石山", "新蒲崗", "樂富", "慈雲山", "彩雲", "牛池灣", "wong tai sin", "diamond hill", "san po kong", "lok fu", "tsz wan shan", "choi wan", "ngau chi wan"] },
  { code: "HK-KT", keywords: ["觀塘", "牛頭角", "九龍灣", "藍田", "油塘", "秀茂坪", "kwun tong", "ngau tau kok", "kowloon bay", "lam tin", "yau tong", "sau mau ping"] },
  { code: "HK-CW", keywords: ["中環", "上環", "西環", "西營盤", "堅尼地城", "金鐘", "半山", "central", "sheung wan", "sai wan", "sai ying pun", "kennedy town", "admiralty", "mid-levels"] },
  { code: "HK-WC", keywords: ["灣仔", "銅鑼灣", "跑馬地", "大坑", "wan chai", "causeway bay", "happy valley", "tai hang"] },
  { code: "HK-EA", keywords: ["北角", "鰂魚涌", "太古", "西灣河", "筲箕灣", "柴灣", "小西灣", "炮台山", "天后", "north point", "quarry bay", "taikoo", "sai wan ho", "shau kei wan", "chai wan", "siu sai wan", "fortress hill", "tin hau"] },
  { code: "HK-SO", keywords: ["香港仔", "黃竹坑", "鴨脷洲", "赤柱", "淺水灣", "薄扶林", "aberdeen", "wong chuk hang", "ap lei chau", "stanley", "repulse bay", "pok fu lam"] },
  { code: "HK-KTQ", keywords: ["葵涌", "葵芳", "葵興", "青衣", "荔景", "安蔭", "kwai chung", "kwai fong", "kwai hing", "tsing yi", "lai king", "on yam"] },
  { code: "HK-TW", keywords: ["荃灣", "汀九", "深井", "珀麗灣", "馬灣", "悅來坊", "tsuen wan", "ting kau", "sham tseng", "park island", "ma wan", "panda place"] },
  { code: "HK-TM", keywords: ["屯門", "良景", "安定", "蝴蝶", "tuen mun", "leung king", "on ting", "butterfly"] },
  { code: "HK-YL", keywords: ["元朗", "天水圍", "yoho", "yuen long", "tin shui wai"] },
  { code: "HK-N", keywords: ["上水", "粉嶺", "sheung shui", "fanling"] },
  { code: "HK-TP", keywords: ["大埔", "太和", "tai po", "tai wo"] },
  { code: "HK-ST", keywords: ["沙田", "大圍", "馬鞍山", "火炭", "石門", "科學園", "恆安", "耀安", "sha tin", "shatin", "tai wai", "ma on shan", "fo tan", "shek mun", "science park", "heng on", "yiu on"] },
  { code: "HK-SK", keywords: ["將軍澳", "西貢", "坑口", "寶琳", "調景嶺", "景林", "tseung kwan o", "tsueng kwan o", "sai kung", "hang hau", "po lam", "tiu keng leng", "king lam"] },
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
    .replace(/\s+,/g, ",")
    .trim()
    .replace(/,+$/g, "");
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
    throw new Error(`Expected array of Anytime Fitness detail objects in ${filePath}`);
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
