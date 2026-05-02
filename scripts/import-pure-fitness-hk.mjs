#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the PURE Hong Kong club pages.
 *
 * PURE publishes location metadata in WordPress pages with JSON-LD Place
 * blocks. This importer keeps only PURE Fitness clubs, pairs English and
 * Traditional Chinese pages, and leaves precise equipment counts as null.
 *
 * Usage:
 *   node scripts/import-pure-fitness-hk.mjs
 *   node scripts/import-pure-fitness-hk.mjs --out data/imports/pure-fitness-hk.json
 *   node scripts/import-pure-fitness-hk.mjs --details-out data/imports/raw-pure-fitness-hk-details.json
 *   node scripts/import-pure-fitness-hk.mjs --details-file data/imports/raw-pure-fitness-hk-details.json
 *   node scripts/import-pure-fitness-hk.mjs --skip-geocode
 *   node scripts/import-pure-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const LIST_URL_EN = "https://www.pure-360.com.hk/en/clubs/";
const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";
const DETAIL_FETCH_CONCURRENCY = 4;

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const districtOverrides = args["district-overrides"]
    ? await loadDistrictOverrides(args["district-overrides"])
    : {};
  const geocoder = createMapboxGeocoder(args);

  const details = args["details-file"]
    ? await loadDetailsFile(args["details-file"])
    : await fetchClubDetailsFromSite();

  if (args["details-out"]) {
    const detailsOutPath = path.resolve(process.cwd(), args["details-out"]);
    await mkdir(path.dirname(detailsOutPath), { recursive: true });
    await writeFile(detailsOutPath, `${JSON.stringify(details, null, 2)}\n`);
    console.log(`Wrote ${details.length} PURE Fitness detail snapshots to ${detailsOutPath}`);
  }

  const rows = details
    .filter((detail) => detail.is_fitness)
    .map((detail) => mapClubToGymRow(detail, districtOverrides))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (geocoder) {
    for (const row of rows) {
      if (row.lat !== null && row.lng !== null) continue;
      const coordinates = await geocoder(row);
      row.lat = row.lat ?? coordinates?.lat ?? null;
      row.lng = row.lng ?? coordinates?.lng ?? null;
    }
  }

  const unknownDistricts = rows.filter((row) => !row.district_code);
  if (unknownDistricts.length > 0) {
    const examples = unknownDistricts
      .slice(0, 10)
      .map((row) => `- ${row.slug}: ${row.address_zh ?? row.address ?? "no address"}`)
      .join("\n");
    throw new Error(
      [
        `Could not infer district_code for ${unknownDistricts.length} gyms.`,
        "Add overrides with --district-overrides <json>. Keys can be club URLs, branch codes, or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/pure-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} PURE Fitness HK baseline rows to ${outPath}`);

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

function createMapboxGeocoder(parsedArgs) {
  if (parsedArgs["skip-geocode"]) return null;

  const accessToken = process.env.MAPBOX_PRIVATE_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!accessToken) return null;

  const cache = new Map();
  const tokenSource = process.env.MAPBOX_PRIVATE_TOKEN
    ? "MAPBOX_PRIVATE_TOKEN"
    : "NEXT_PUBLIC_MAPBOX_TOKEN";
  let geocodingDisabled = false;

  return async function geocodeRow(row) {
    if (geocodingDisabled) return null;

    const query = buildGeocodeQuery(row.address);
    if (!query) return null;

    const cacheKey = `${query}|${row.district_code ?? ""}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const url = new URL(MAPBOX_GEOCODE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("country", "HK");
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", "1");
    url.searchParams.set("autocomplete", "false");
    url.searchParams.set("permanent", "false");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
        Accept: "application/json",
      },
    });

    const payload = await response.text();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        geocodingDisabled = true;
        console.warn(
          [
            `Skipping Mapbox geocoding after ${response.status} on "${row.slug}".`,
            `Current token source: ${tokenSource}.`,
            "Set a server-side MAPBOX_PRIVATE_TOKEN with Search/Geocoding access, or rerun with --skip-geocode.",
          ].join(" ")
        );
        return null;
      }

      throw new Error(
        `Mapbox geocoding failed for "${row.slug}": ${response.status} ${payload.slice(0, 300)}`
      );
    }

    const data = JSON.parse(payload);
    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    const coordinates = Array.isArray(feature?.geometry?.coordinates)
      ? {
          lng: toNumber(feature.geometry.coordinates[0]),
          lat: toNumber(feature.geometry.coordinates[1]),
        }
      : null;

    const result =
      coordinates && coordinates.lat !== null && coordinates.lng !== null
        ? coordinates
        : null;

    cache.set(cacheKey, result);
    return result;
  };
}

function buildGeocodeQuery(address) {
  const value = getString(address);
  if (!value) return null;

  const capped = value.split(/\s+/).filter(Boolean).slice(0, 20).join(" ");
  return capped.trim() || null;
}

async function fetchClubDetailsFromSite() {
  const listHtml = await fetchHtml(LIST_URL_EN);
  const clubUrls = extractClubUrls(listHtml);
  const limitedUrls = args.limit ? clubUrls.slice(0, Number(args.limit)) : clubUrls;
  const details = await mapWithConcurrency(
    limitedUrls,
    DETAIL_FETCH_CONCURRENCY,
    fetchClubDetailPair
  );

  return details.filter((detail) => detail.is_fitness);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

async function fetchClubDetailPair(enUrl) {
  const enDetail = await fetchClubDetail(enUrl, "en");
  const zhUrl = toLocalizedClubUrl(enUrl, "tc");
  let zhDetail = null;

  if (zhUrl) {
    try {
      zhDetail = await fetchClubDetail(zhUrl, "zh");
    } catch (error) {
      console.warn(
        `Failed to fetch zh detail for ${enUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return {
    url: enDetail.url,
    url_zh: zhDetail?.url ?? zhUrl,
    branch_code: enDetail.branch_code ?? zhDetail?.branch_code ?? null,
    title: enDetail.title,
    title_zh: zhDetail?.title ?? null,
    name: enDetail.name,
    name_zh: zhDetail?.name ?? null,
    address: enDetail.address,
    address_zh: zhDetail?.address ?? null,
    contact_phone: enDetail.contact_phone ?? zhDetail?.contact_phone ?? null,
    lat: enDetail.lat ?? zhDetail?.lat ?? null,
    lng: enDetail.lng ?? zhDetail?.lng ?? null,
    is_fitness: enDetail.is_fitness,
    is_active: enDetail.is_active,
    amenities: enDetail.amenities,
    amenities_zh: zhDetail?.amenities ?? [],
  };
}

async function fetchClubDetail(url, locale) {
  const html = await fetchHtml(url);
  const textBlocks = htmlToTextBlocks(html);
  const text = textBlocks.join(" ");
  const title = extractTitle(html);
  const primaryPlace = extractPrimaryPlaceJson(html);
  const h1 = extractTagContent(html, "h1");

  return {
    url,
    title,
    name: primaryPlace?.name ?? h1 ?? null,
    address: normalizeAddress(primaryPlace?.address ?? extractAddress(textBlocks, locale)),
    branch_code: getString(primaryPlace?.branchCode),
    contact_phone: normalizePhone(primaryPlace?.telephone ?? extractPhone(text)),
    lat: toNumber(primaryPlace?.geo?.latitude),
    lng: toNumber(primaryPlace?.geo?.longitude),
    is_fitness: isFitnessClub({ title, name: primaryPlace?.name ?? h1, text }),
    is_active: !/permanently closed|closed down|temporarily closed/i.test(text),
    amenities: extractAmenities(textBlocks, locale),
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status} ${text.slice(0, 300)}`);
  }

  return text;
}

function extractClubUrls(html) {
  const urls = extractHrefs(html)
    .map((href) => resolveUrl(LIST_URL_EN, href))
    .filter((url) => isClubDetailUrl(url))
    .map((url) => normalizeClubUrl(url));

  return [...new Set(urls)].sort((a, b) => a.localeCompare(b));
}

function isClubDetailUrl(url) {
  if (!url?.startsWith("https://www.pure-360.com.hk/en/clubs/")) return false;
  const parsed = new URL(url);
  if (parsed.hash || parsed.search) return false;

  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments.length === 3 && segments[0] === "en" && segments[1] === "clubs";
}

function normalizeClubUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = `${parsed.pathname.replace(/\/+$/g, "")}/`;
  return parsed.toString();
}

function toLocalizedClubUrl(url, locale) {
  if (!url || !locale) return null;
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 3 || segments[1] !== "clubs") return null;
  segments[0] = locale;
  parsed.pathname = `/${segments.join("/")}/`;
  return parsed.toString();
}

function extractHrefs(html) {
  const matches = html.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi);
  const hrefs = [];
  for (const match of matches) {
    const href = match[1] ?? match[2];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

function resolveUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractPrimaryPlaceJson(html) {
  const places = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1]).trim());
      collectPlaceObjects(parsed, places);
    } catch {
      // Ignore malformed third-party JSON-LD blocks.
    }
  }

  return (
    places.find((place) => getString(place.name) && getString(place.address)) ??
    places.find((place) => getString(place.address)) ??
    null
  );
}

function collectPlaceObjects(value, places) {
  if (Array.isArray(value)) {
    for (const item of value) collectPlaceObjects(item, places);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value["@type"] === "Place") places.push(value);
  if (Array.isArray(value["@graph"])) collectPlaceObjects(value["@graph"], places);
}

function extractTitle(html) {
  const metaTitle =
    extractMetaContent(html, "og:title") ??
    extractMetaContent(html, "twitter:title") ??
    extractTagContent(html, "title");

  return metaTitle ? decodeHtmlEntities(metaTitle).trim() : null;
}

function extractMetaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapeRegExp(property)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegExp(property)}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapeRegExp(property)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]).trim();
  }

  return null;
}

function extractTagContent(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeHtmlEntities(stripTags(match[1])).trim() : null;
}

function isFitnessClub({ title, name, text }) {
  const titleOrName = [title, name].filter(Boolean).join(" ");
  if (/\bFitness Club\b/i.test(titleOrName)) return true;
  if (/\(Fitness\)|（健身）/.test(titleOrName)) return true;
  if (/\bAll Fitness\s*-/i.test(text)) return true;
  return /\bFree Weight Equipment\b|\bCardio Equipment\b/i.test(text);
}

function extractAddress(blocks, locale) {
  const label = locale === "zh" ? "位置" : "Find us";
  const labelIndex = blocks.findIndex((block) => block === label);
  if (labelIndex >= 0) {
    const next = blocks[labelIndex + 1];
    if (next && !/^(Contact|聯絡|Club Hours|營業時間)$/i.test(next)) {
      return next;
    }
  }
  return null;
}

function extractPhone(text) {
  return text.match(/(?:\+852\s*)?\d{4}\s?\d{4}/)?.[0] ?? null;
}

function extractAmenities(blocks, locale) {
  const startLabel = locale === "zh" ? "所有設施" : "All Amenities";
  const endLabels =
    locale === "zh"
      ? ["Upcoming Classes", "即將舉行的課堂", "Filter"]
      : ["Upcoming Classes", "Filter"];
  const start = blocks.findIndex((block) => block === startLabel);
  if (start < 0) return [];

  const amenities = [];
  for (let index = start + 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (endLabels.some((label) => block.includes(label))) break;
    if (block.length > 80) continue;
    if (/^(Back|返回|Find us|位置|Contact|聯絡|Club Hours|營業時間)$/i.test(block)) continue;
    amenities.push(block);
  }

  return [...new Set(amenities)].slice(0, 40);
}

function htmlToTextBlocks(html) {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/header|\/footer|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<(p|div|li|section|article|header|footer|h[1-6])\b[^>]*>/gi, "\n");

  const text = decodeHtmlEntities(stripTags(withoutNoise))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&ensp;/gi, " ")
    .replace(/&emsp;/gi, " ")
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .trim();
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

function mapClubToGymRow(detail, districtOverrides) {
  const branchCode = getString(detail.branch_code);
  const baseName = cleanPureClubName(detail.name ?? detail.title);
  const baseNameZh = cleanPureClubName(detail.name_zh ?? detail.title_zh);
  const slug = toSlug(["pure-fitness", baseName, branchCode].filter(Boolean).join(" "));
  const amenities = detail.amenities?.length ? detail.amenities.join(", ") : null;

  return {
    name: `PURE Fitness ${baseName}`,
    name_zh: baseNameZh ? `PURE Fitness ${baseNameZh}` : null,
    slug,
    address: detail.address,
    address_zh: detail.address_zh ?? null,
    district_code:
      districtOverrides[detail.url] ??
      districtOverrides[branchCode] ??
      districtOverrides[slug] ??
      inferDistrictCode([baseName, baseNameZh, detail.address, detail.address_zh].filter(Boolean).join(" ")),
    country_code: "HK",
    website_url: detail.url ?? LIST_URL_EN,
    contact_phone: normalizePhone(detail.contact_phone),
    lat: toNumber(detail.lat),
    lng: toNumber(detail.lng),
    is_active: detail.is_active,
    data_source: "import",
    last_reported_at: new Date().toISOString(),
    ...buildNullEquipmentFields(),
    has_washroom: true,
    has_bathroom: true,
    equipment_notes: amenities ? `Amenities listed by PURE: ${amenities}` : null,
  };
}

function cleanPureClubName(value) {
  const name = getString(value);
  if (!name) return null;
  return name
    .replace(/^Discover\s+/i, "")
    .replace(/\s+-\s+Experience\s+PURE\s+Fitness\s+Today$/i, "")
    .replace(/\s+Fitness\s+Club\s+in\s+.+$/i, "")
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

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(value) {
  const phone = getString(value);
  return phone?.replace(/\s+/g, "") ?? null;
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
    throw new Error(`Expected array of PURE Fitness detail objects in ${filePath}`);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
