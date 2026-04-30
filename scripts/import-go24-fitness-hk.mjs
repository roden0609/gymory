#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the GO24 Fitness Hong Kong location pages.
 *
 * GO24 publicly lists branch names, addresses, phone numbers, and "look inside"
 * pages. It does not expose structured equipment inventory, so this importer
 * explicitly writes all Gymory equipment fields as null.
 *
 * Usage:
 *   node scripts/import-go24-fitness-hk.mjs
 *   node scripts/import-go24-fitness-hk.mjs --out data/imports/go24-fitness-hk.json
 *   node scripts/import-go24-fitness-hk.mjs --details-out data/imports/raw-go24-fitness-hk-details.json
 *   node scripts/import-go24-fitness-hk.mjs --details-file data/imports/raw-go24-fitness-hk-details.json
 *   node scripts/import-go24-fitness-hk.mjs --skip-geocode
 *   node scripts/import-go24-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const LIST_URL = "https://www.go24fitness.com/en/locations";
const SOURCE_URL = LIST_URL;
const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";

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
    : await fetchBranchDetailsFromSite();

  if (args["details-out"]) {
    const detailsOutPath = path.resolve(process.cwd(), args["details-out"]);
    await mkdir(path.dirname(detailsOutPath), { recursive: true });
    await writeFile(detailsOutPath, `${JSON.stringify(details, null, 2)}\n`);
    console.log(`Wrote ${details.length} GO24 detail snapshots to ${detailsOutPath}`);
  }

  const rows = details
    .map((detail) => mapBranchToGymRow(detail, districtOverrides))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (geocoder) {
    for (const row of rows) {
      const coordinates = await geocoder(row);
      row.lat = coordinates?.lat ?? null;
      row.lng = coordinates?.lng ?? null;
    }
  }

  const unknownDistricts = rows.filter((row) => !row.district_code);
  if (unknownDistricts.length > 0) {
    const examples = unknownDistricts
      .slice(0, 10)
      .map((row) => `- ${row.slug}: ${row.address ?? "no address"}`)
      .join("\n");
    throw new Error(
      [
        `Could not infer district_code for ${unknownDistricts.length} gyms.`,
        "Add overrides with --district-overrides <json>. Keys can be branch URLs or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/go24-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} GO24 Fitness HK baseline rows to ${outPath}`);

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

async function fetchBranchDetailsFromSite() {
  const listHtml = await fetchHtml(LIST_URL);
  const branchUrls = extractBranchUrls(listHtml);
  const limitedUrls = args.limit ? branchUrls.slice(0, Number(args.limit)) : branchUrls;
  const details = [];

  for (const url of limitedUrls) {
    details.push(await fetchBranchDetailPair(url));
  }

  return details;
}

async function fetchBranchDetailPair(enUrl) {
  const enDetail = await fetchBranchDetail(enUrl, "en");
  const zhUrl = toLocalizedBranchDetailUrl(enUrl, "zh");
  let zhDetail = null;

  if (zhUrl) {
    try {
      zhDetail = await fetchBranchDetail(zhUrl, "zh");
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
    title: enDetail.title,
    title_zh: zhDetail?.title ?? null,
    address: enDetail.address,
    address_zh: zhDetail?.address ?? null,
    phone: enDetail.phone ?? zhDetail?.phone ?? null,
    is_active: enDetail.is_active,
  };
}

async function fetchBranchDetail(url, locale = "en") {
  const html = await fetchHtml(url);
  const blocks = htmlToTextBlocks(html);
  const title = cleanTitle(extractTitle(html));
  const titleIndex = findTitleIndex(blocks, title);
  const phone = extractPhone(blocks, titleIndex);
  const address =
    extractAddressFromPrimaryInfoColumn(html, title) ??
    extractAddress(blocks, { phone, titleIndex, locale });
  const pageText = blocks.join("\n");

  return {
    url,
    title,
    address,
    phone,
    is_active: inferIsActive(pageText),
  };
}

function extractBranchUrls(html) {
  const hrefs = extractHrefs(html);
  const urls = hrefs
    .map((href) => resolveUrl(LIST_URL, href))
    .filter((url) => isBranchDetailUrl(url));

  return [...new Set(urls)];
}

function toLocalizedBranchDetailUrl(url, locale) {
  if (!url || !locale) return null;
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 3) return null;
  if (segments[1] !== "look-inside") return null;
  segments[0] = locale;
  parsed.pathname = `/${segments.join("/")}`;
  return parsed.toString();
}

function isBranchDetailUrl(url) {
  if (!url || !url.startsWith("https://www.go24fitness.com/en/look-inside/")) return false;

  const parsed = new URL(url);
  if (parsed.hash || parsed.search) return false;

  const segments = parsed.pathname.split("/").filter(Boolean);
  return (
    segments.length === 3 &&
    segments[0] === "en" &&
    segments[1] === "look-inside" &&
    segments[2] !== ""
  );
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

function extractTitle(html) {
  const metaTitle =
    extractMetaContent(html, "og:title") ??
    extractMetaContent(html, "twitter:title") ??
    extractTagContent(html, "title");

  if (metaTitle) return metaTitle;

  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return heading ? decodeHtmlEntities(stripTags(heading[1])) : null;
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

function cleanTitle(value) {
  const title = getString(value);
  if (!title) return null;
  return title.replace(/\s+\|\s+GO24 FITNESS$/i, "").trim();
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
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "...")
    .replace(/&ensp;/gi, " ")
    .replace(/&emsp;/gi, " ")
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .trim();
}

function findTitleIndex(blocks, title) {
  if (!title) return -1;
  const normalizedTitle = title.replace(/\s+/g, " ").trim().toLowerCase();
  return blocks.findIndex(
    (block) => block.replace(/\s+/g, " ").trim().toLowerCase() === normalizedTitle
  );
}

function extractPhone(blocks, titleIndex = -1) {
  const searchStart = titleIndex >= 0 ? titleIndex + 1 : 0;
  const searchEnd = Math.min(blocks.length, searchStart + 18);
  const searchBlocks = blocks.slice(searchStart, searchEnd);
  const phoneBlock =
    searchBlocks.find((block) => isPhoneBlock(block)) ??
    blocks.find((block) => isPhoneBlock(block));
  return normalizePhone(phoneBlock);
}

function isPhoneBlock(value) {
  if (!/^[+\d()\-\s]+$/.test(value)) return false;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length === 8 || digits.length === 11 || digits.length === 12;
}

function extractAddressFromPrimaryInfoColumn(html, title) {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return null;

  const heading = decodeHtmlEntities(stripTags(h1Match[1])).trim();
  if (title && heading && heading !== title) return null;

  const afterHeading = html.slice((h1Match.index ?? 0) + h1Match[0].length);
  const infoColumnMatch = afterHeading.match(
    /<div class="uk-width-1-2@s">([\s\S]*?)<\/div>\s*<div class="uk-width-1-2@s">/i
  );
  if (!infoColumnMatch) return null;

  const lines = [...infoColumnMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeHtmlEntities(stripTags(match[1])).trim())
    .filter(Boolean)
    .map((line) => normalizeAddressPart(line));

  if (lines.length === 0) return null;
  return normalizeAddress(lines.join(", "));
}

function extractAddress(blocks, { phone, titleIndex = -1, locale = "en" }) {
  if (blocks.length === 0) return null;

  const phoneIndex =
    phone === null
      ? -1
      : blocks.findIndex((block) => normalizePhone(block) === phone || isPhoneBlock(block));

  const searchStart = titleIndex >= 0 ? titleIndex + 1 : 0;
  const searchEnd = phoneIndex > searchStart ? phoneIndex : Math.min(blocks.length, searchStart + 10);
  const groups = [];
  let currentGroup = [];

  for (let index = searchStart; index < searchEnd; index += 1) {
    const block = blocks[index];
    if (looksLikeAddressPart(block, locale)) {
      currentGroup.push({
        index,
        value: normalizeAddressPart(block),
        score: scoreAddressPart(block, locale),
      });
      continue;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const ranked = groups
    .map((group) => ({
      value: normalizeAddress(group.map((item) => item.value).join(", ")),
      score: group.reduce((sum, item) => sum + item.score, 0),
    }))
    .filter((group) => group.value);

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.value ?? null;
}

function looksLikeAddressPart(value, locale = "en") {
  if (!value || value.length < 6) return false;
  if (isPhoneBlock(value)) return false;
  if (/^(join now|free trial|image|the leading 24-hour|your spacious|the best gym|experience|view other gyms|class schedule)/i.test(value)) {
    return false;
  }

  const hasCjk = /[\u3400-\u9fff]/.test(value);
  if (locale === "zh" || hasCjk) {
    return (
      /[\u3400-\u9fff]/.test(value) &&
      (/\d/.test(value) || /(香港|九龍|新界|離島)/.test(value)) &&
      /(香港|九龍|新界|離島|港島|街|道|號|樓|地下|商場|中心|大廈|堅尼地城|中環|灣仔|北角|荃灣|元朗|黃大仙|荔枝角|旺角)/.test(
        value
      )
    );
  }

  return (
    /[A-Za-z]/.test(value) &&
    (/\d/.test(value) || /(hong kong|kowloon|new territories|lantau)/i.test(value)) &&
    /(road|rd|street|st|floor|f\/|g\/f|1\/f|2\/f|shop|plaza|centre|center|mall|building|tower|basement|hong kong|kowloon|wan chai|central|mong kok|kennedy town|north point|shau kei wan|taikoo|tsuen wan|yuen long|lai chi kok|wong tai sin|queens road|sai yee street)/i.test(
      value
    )
  );
}

function scoreAddressPart(value, locale = "en") {
  const hasCjk = /[\u3400-\u9fff]/.test(value);
  let score = 0;
  if (/\d/.test(value)) score += 3;
  if (/[，,]/.test(value)) score += 2;
  if (
    (locale === "zh" || hasCjk) &&
    /(街|道|號|樓|地下|商場|中心|大廈|香港|九龍|新界|離島|港島)/.test(value)
  ) {
    score += 4;
  }
  if (
    (locale !== "zh" || !hasCjk) &&
    /(road|rd|street|st|floor|f\/|g\/f|shop|plaza|centre|center|mall|building|tower|basement)/i.test(
      value
    )
  ) {
    score += 4;
  }
  if (/(hong kong|kowloon|new territories|香港|九龍|新界|離島)/i.test(value)) score += 2;
  return score;
}

function normalizeAddressPart(value) {
  return value
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,+$/g, "");
}

function normalizeAddress(value) {
  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const deduped = [];
  for (const segment of segments) {
    const normalized = segment.toLowerCase();
    if (deduped.some((existing) => existing.toLowerCase() === normalized)) continue;
    deduped.push(segment);
  }

  return deduped
    .join(", ")
    .replace(/\bHong Kong,\s*Hong Kong\b/i, "Hong Kong")
    .replace(/\bKowloon,\s*Kowloon\b/i, "Kowloon")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function inferIsActive(text) {
  return !/permanently closed|closed down|temporarily closed/i.test(text);
}

function mapBranchToGymRow(detail, districtOverrides) {
  const slug = toSlug(["go24-fitness", detail.title].filter(Boolean).join(" "));
  const name = detail.title?.startsWith("ONYX") ? detail.title : `GO24 Fitness ${detail.title}`;
  const nameZh = detail.title_zh
    ? detail.title?.startsWith("ONYX")
      ? detail.title_zh
      : `GO24 Fitness ${detail.title_zh}`
    : null;

  return {
    name,
    name_zh: nameZh,
    slug,
    address: detail.address,
    address_zh: detail.address_zh ?? null,
    district_code:
      districtOverrides[detail.url] ??
      districtOverrides[slug] ??
      inferDistrictCode([detail.title, detail.address].filter(Boolean).join(" ")),
    country_code: "HK",
    website_url: detail.url ?? SOURCE_URL,
    contact_phone: detail.phone,
    lat: null,
    lng: null,
    is_active: detail.is_active,
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
    has_hack_squat: null,
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
    throw new Error(`Expected array of GO24 detail objects in ${filePath}`);
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
