#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from the EFX24 Hong Kong branch pages.
 *
 * EFX24 publicly lists branch names, addresses, phone numbers, and localized
 * detail pages. It does not expose structured equipment inventory, so this
 * importer explicitly writes all Gymory equipment fields as null.
 *
 * Usage:
 *   node scripts/import-efx24-hk.mjs
 *   node scripts/import-efx24-hk.mjs --out data/imports/efx24-hk.json
 *   node scripts/import-efx24-hk.mjs --details-out data/imports/raw-efx24-hk-details.json
 *   node scripts/import-efx24-hk.mjs --details-file data/imports/raw-efx24-hk-details.json
 *   node scripts/import-efx24-hk.mjs --browser
 *   node scripts/import-efx24-hk.mjs --browser --browser-profile path/to/profile
 *   node scripts/import-efx24-hk.mjs --skip-geocode
 *   node scripts/import-efx24-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createChromeHtmlFetcher as createSharedChromeHtmlFetcher } from "./lib/chrome-html-fetcher.mjs";
import { assertNotChallengeHtml as assertNotSharedChallengeHtml } from "./lib/importer-output-validation.mjs";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

const LIST_URL = "https://efx24.com/find-us/";
const SOURCE_URL = LIST_URL;
const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";
const ALLOWED_ARGS = new Set([
  "browser",
  "browser-profile",
  "details-file",
  "details-out",
  "district-overrides",
  "limit",
  "out",
  "skip-geocode",
  "upsert",
]);

const isDirectExecution =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = isDirectExecution ? parseArgs(process.argv.slice(2)) : {};

if (isDirectExecution) {
  await loadEnvFiles(["apps/web/.env.dev"]);
  // await loadEnvFiles(["apps/web/.env.prod"]);
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export async function main(parsedArgs = args) {
  return runImporter(parsedArgs);
}

export async function runImporter(parsedArgs, dependencies = {}) {
  const loadOverrides = dependencies.loadDistrictOverrides ?? loadDistrictOverrides;
  const loadDetails = dependencies.loadDetailsFile ?? loadDetailsFile;
  const fetchDetails = dependencies.fetchBranchDetailsFromSite ?? fetchBranchDetailsFromSite;
  const createBrowserFetcher =
    dependencies.createChromeHtmlFetcher ?? createChromeHtmlFetcher;
  const makeGeocoder = dependencies.createMapboxGeocoder ?? createMapboxGeocoder;
  const writeDetails = dependencies.writeDetails ?? writeJsonFile;
  const writeRows = dependencies.writeRows ?? writeJsonFile;
  const persistRows = dependencies.upsertRows ?? upsertRows;
  const now = dependencies.now?.() ?? new Date();
  const cwd = dependencies.cwd?.() ?? process.cwd();
  const log = dependencies.log ?? console.log;

  const districtOverrides = parsedArgs["district-overrides"]
    ? await loadOverrides(parsedArgs["district-overrides"])
    : {};
  const geocoder = makeGeocoder(parsedArgs);

  let details;
  if (parsedArgs["details-file"]) {
    details = await loadDetails(parsedArgs["details-file"], parsedArgs.limit);
  } else if (parsedArgs.browser) {
    const browserSession = await createBrowserFetcher({
      cwd,
      profilePath: parsedArgs["browser-profile"],
      log,
    });
    try {
      details = await fetchDetails(parsedArgs.limit, browserSession.fetchHtml);
    } finally {
      await browserSession.close();
    }
  } else {
    details = await fetchDetails(parsedArgs.limit);
  }
  validateBranchDetails(details);

  if (parsedArgs["details-out"]) {
    const detailsOutPath = path.resolve(cwd, parsedArgs["details-out"]);
    await writeDetails(detailsOutPath, details);
    log(`Wrote ${details.length} EFX24 detail snapshots to ${detailsOutPath}`);
  }

  const rows = details
    .map((detail) => mapBranchToGymRow(detail, districtOverrides, now))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const slugs = rows.map(({ slug }) => slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("EFX24 details produced duplicate gym slugs");
  }

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
      .map((row) => `- ${row.slug}: ${row.address_zh ?? row.address ?? "no address"}`)
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
    cwd,
    parsedArgs.out ?? "data/imports/efx24-hk-baseline.json"
  );
  await writeRows(outPath, rows);

  log(`Wrote ${rows.length} EFX24 HK baseline rows to ${outPath}`);

  if (parsedArgs.upsert) {
    await persistRows(rows);
    log(`Upserted ${rows.length} rows into Supabase gyms on slug`);
  } else {
    log("Dry run only. Pass --upsert to write to Supabase.");
  }

  return { rows, outPath, upserted: Boolean(parsedArgs.upsert) };
}

export function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (!ALLOWED_ARGS.has(key)) {
      throw new Error(`Unknown argument: --${key}`);
    }
    if (key === "browser" || key === "skip-geocode" || key === "upsert") {
      parsed[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed[key] = next;
    index += 1;
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

    const query = row.address_zh ?? row.address;
    if (!query) return null;

    const cacheKey = `${query}|${row.district_code ?? ""}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const url = new URL(MAPBOX_GEOCODE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("country", "HK");
    url.searchParams.set("language", "zh-Hant,en");
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
      throw new Error(`Mapbox geocoding failed for "${row.slug}": ${response.status} ${payload.slice(0, 300)}`);
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

  assertNotChallengeHtml(text, url);

  return text;
}

export async function createChromeHtmlFetcher({
  cwd = process.cwd(),
  profilePath,
  log = console.log,
  env = process.env,
} = {}) {
  return createSharedChromeHtmlFetcher({
    sourceLabel: "EFX24",
    defaultProfilePath: ".cache/efx24-chrome-profile",
    cwd,
    profilePath,
    log,
    env,
  });
}

export function assertNotChallengeHtml(html, source = "EFX24") {
  assertNotSharedChallengeHtml(html, `EFX24 response from ${source}`);
}

async function fetchBranchDetailsFromSite(limit, htmlFetcher = fetchHtml) {
  const listHtml = await htmlFetcher(LIST_URL);
  const branchUrls = extractBranchUrls(listHtml);
  const limitedUrls = limit ? branchUrls.slice(0, Number(limit)) : branchUrls;
  const details = [];

  for (const url of limitedUrls) {
    details.push(await fetchBranchDetail(url, htmlFetcher));
  }

  return details;
}

async function fetchBranchDetail(url, htmlFetcher = fetchHtml) {
  const html = await htmlFetcher(url);
  const zhUrl = extractLocalizedDetailUrl(html, url);
  const zhHtml = zhUrl ? await htmlFetcher(zhUrl) : null;

  const blocks = htmlToTextBlocks(html);
  const zhBlocks = zhHtml ? htmlToTextBlocks(zhHtml) : [];
  const pageTitle = extractTitle(html);
  const zhPageTitle = zhHtml ? extractTitle(zhHtml) : null;
  const cleanPageTitle = cleanTitle(pageTitle);
  const cleanZhPageTitle = cleanTitle(zhPageTitle);
  const titleIndex = findTitleIndex(blocks, cleanPageTitle);
  const zhTitleIndex = findTitleIndex(zhBlocks, cleanZhPageTitle);

  const phone = extractPhone(blocks, titleIndex);
  const email = extractEmail(blocks);
  const address = extractAddress(blocks, { phone, locale: "en", titleIndex });
  const addressZh = extractAddress(zhBlocks, {
    phone,
    locale: "zh",
    titleIndex: zhTitleIndex,
  });
  return {
    url,
    zh_url: zhUrl,
    title: cleanPageTitle,
    title_zh: cleanZhPageTitle,
    address,
    address_zh: addressZh,
    phone,
    email,
    is_active: inferIsActive(blocks, titleIndex),
  };
}

export function extractBranchUrls(html) {
  assertNotChallengeHtml(html, LIST_URL);
  const hrefs = extractHrefs(html);
  const urls = hrefs
    .map((href) => resolveUrl(LIST_URL, href))
    .filter(
      (url) => isBranchDetailUrl(url)
    );

  const uniqueUrls = [...new Set(urls)];
  if (uniqueUrls.length === 0) {
    throw new Error("Could not extract any EFX24 branch URLs from the list page");
  }
  return uniqueUrls;
}

export function validateBranchDetails(details) {
  if (!Array.isArray(details) || details.length === 0) {
    throw new Error("EFX24 details did not contain any branches");
  }

  const invalid = details.find((detail) => !getString(detail?.url) || !getString(detail?.title));
  if (invalid) {
    throw new Error("Each EFX24 detail must include at least url and title");
  }

  const urls = details.map(({ url }) => url);
  if (new Set(urls).size !== urls.length) {
    throw new Error("EFX24 details contain duplicate branch URLs");
  }
}

function isBranchDetailUrl(url) {
  if (!url || !url.startsWith(LIST_URL) || url.includes("/zh-hant/")) return false;

  const parsed = new URL(url);
  if (parsed.hash || parsed.search) return false;
  if (parsed.pathname === "/find-us/" || parsed.pathname === "/find-us") return false;
  if (parsed.pathname.includes("/find-us/page/")) return false;

  const segments = parsed.pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "find-us";
}

function extractLocalizedDetailUrl(html, fallbackUrl) {
  const hrefs = extractHrefs(html);
  const zhLinks = hrefs
    .map((href) => resolveUrl(fallbackUrl, href))
    .filter(
      (url) =>
        url.startsWith("https://efx24.com/zh-hant/") &&
        url !== "https://efx24.com/zh-hant/" &&
        !url.endsWith("/zh-hant/")
    );

  return zhLinks[0] ?? null;
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
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const headingText = heading ? decodeHtmlEntities(stripTags(heading[1])) : null;
  if (headingText) return headingText;

  const metaTitle =
    extractMetaContent(html, "og:title") ??
    extractMetaContent(html, "twitter:title") ??
    extractTagContent(html, "title");

  if (metaTitle) return metaTitle;
  return null;
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
  return title
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+[|–-]\s+EFX24$/i, "")
    .replace(/\s*\((coming soon|temporarily closed)\)\s*$/i, "")
    .trim();
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

function extractPhone(blocks, titleIndex = -1) {
  const searchStart = titleIndex >= 0 ? titleIndex + 1 : 0;
  const searchEnd = Math.min(blocks.length, searchStart + 18);
  const searchBlocks = blocks.slice(searchStart, searchEnd);
  const phoneBlock = searchBlocks.find((block) => isPhoneBlock(block)) ?? blocks.find((block) => isPhoneBlock(block));
  return normalizePhone(phoneBlock);
}

function isPhoneBlock(value) {
  if (!/^[+\d()\-\s]+$/.test(value)) return false;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length === 8 || digits.length === 11 || digits.length === 12;
}

function extractEmail(blocks) {
  const emailBlock = blocks.find((block) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(block));
  if (!emailBlock) return null;
  const match = emailBlock.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? null;
}

function findTitleIndex(blocks, title) {
  if (!title) return -1;
  const normalizedTitle = normalizeComparableText(title);
  return blocks.findIndex(
    (block) => normalizeComparableText(block) === normalizedTitle
  );
}

function normalizeComparableText(value) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractAddress(blocks, { phone, locale, titleIndex = -1 }) {
  if (blocks.length === 0) return null;

  const phoneIndex =
    phone === null
      ? -1
      : blocks.findIndex((block) => normalizePhone(block) === phone || isPhoneBlock(block));

  const searchStart = titleIndex >= 0 ? titleIndex + 1 : 0;
  const searchEnd = phoneIndex > searchStart ? phoneIndex : Math.min(blocks.length, searchStart + 12);
  const candidates = [];

  for (let index = searchStart; index < searchEnd; index += 1) {
    const block = blocks[index];
    if (!looksLikeAddress(block, locale)) continue;
    candidates.push({
      value: normalizeAddress(block, locale),
      score: scoreAddressCandidate(block, locale),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.value ?? null;
}

function looksLikeAddress(value, locale) {
  if (!value || value.length < 8) return false;
  // Marketing paragraphs can contain location-ish words (e.g. "centered")
  // but should never be treated as addresses.
  if (value.length > 160) return false;
  if (isPhoneBlock(value)) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return false;
  if (/^(free|chat|google|professional|training|facilities|hygiene|entertainment|會員|專業|訓練|便利|衛生|娛樂|立即|experience|located|kickstart|one membership|monthly payment)/i.test(value)) {
    return false;
  }
  if (/^efx24\b/i.test(value)) return false;

  if (locale === "zh") {
    return (
      /[\u3400-\u9fff]/.test(value) &&
      /\d/.test(value) &&
      /(號|樓|舖|鋪|中心|廣場|大廈|道|街|路|站|香港|九龍|新界)/.test(value)
    );
  }

  return (
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /\b(road|rd|street|st|floor|f\/|shop|plaza|centre|center|mall|station|hong kong|kowloon|building|tower)\b/i.test(value)
  );
}

function scoreAddressCandidate(value, locale) {
  let score = 0;
  if (/\d/.test(value)) score += 3;
  if (/,/.test(value)) score += 2;
  if (locale === "zh") {
    if (/(號|樓|舖|鋪|中心|廣場|大廈|道|街|路)/.test(value)) score += 4;
    if (/香港|九龍|新界/.test(value)) score += 1;
  } else {
    if (/\b(road|rd|street|st|floor|f\/|shop|plaza|centre|center|mall|building|tower)\b/i.test(value)) score += 4;
    if (/hong kong|kowloon/i.test(value)) score += 1;
  }
  return score;
}

function normalizeAddress(value, locale) {
  const address = value.replace(/\s{2,}/g, " ").trim();
  if (locale !== "zh") return dedupeEnglishAddress(address);

  const firstSegment = address.split(/[，,]/)[0]?.trim();
  if (firstSegment && /[\u3400-\u9fff]/.test(firstSegment)) return firstSegment;
  return address;
}

function dedupeEnglishAddress(address) {
  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) return address;

  const deduped = [];
  for (const segment of segments) {
    const normalizedSegment = normalizeEnglishAddressSegment(segment);
    const isDuplicate = deduped.some(
      (existing) => normalizeEnglishAddressSegment(existing) === normalizedSegment
    );
    if (!isDuplicate) deduped.push(segment);
  }

  return deduped.join(", ");
}

function normalizeEnglishAddressSegment(value) {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferIsActive(blocks, titleIndex = -1) {
  const statusPattern = /(coming soon|temporarily closed|branch closed|closed permanently)/i;
  if (!Array.isArray(blocks) || blocks.length === 0) return true;

  // Only inspect text near the branch-specific section to avoid footer/menu noise.
  const start = titleIndex >= 0 ? Math.max(0, titleIndex - 2) : 0;
  const end = titleIndex >= 0 ? Math.min(blocks.length, titleIndex + 16) : Math.min(blocks.length, 12);
  const localText = blocks.slice(start, end).join("\n");
  return !statusPattern.test(localText);
}

export function mapBranchToGymRow(detail, districtOverrides = {}, now = new Date()) {
  const title = detail.title ?? detail.title_zh ?? "EFX24";
  const slug = toSlug(title);
  const districtText = [
    detail.title,
    detail.title_zh,
    detail.address,
    detail.address_zh,
    detail.url,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name: title,
    name_zh: detail.title_zh ?? null,
    slug,
    address: detail.address ?? null,
    address_zh: detail.address_zh ?? null,
    district_code:
      districtOverrides[detail.url] ??
      districtOverrides[slug] ??
      inferDistrictCode(districtText),
    country_code: "HK",
    website_url: detail.url ?? SOURCE_URL,
    contact_phone: normalizePhone(detail.phone),
    lat: null,
    lng: null,
    is_active: detail.is_active ?? true,
    data_source: "import",
    last_reported_at: now.toISOString(),
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
    has_workout_sandbag: null,
    has_boxing_sandbag: null,
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
    has_washroom: null,
    has_bathroom: null,
    has_yoga_block: null,
    has_yoga_mat: null,
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
  { code: "HK-YTM", keywords: ["油麻地", "尖沙咀", "旺角", "佐敦", "大角咀", "太子", "奧運", "yau ma tei", "tsim sha tsui", "mong kok", "mongkok", "jordan", "tai kok tsui", "prince edward", "olympic"] },
  { code: "HK-SSP", keywords: ["深水埗", "長沙灣", "荔枝角", "美孚", "石硤尾", "南昌", "sham shui po", "cheung sha wan", "lai chi kok", "mei foo", "shek kip mei", "nam cheong"] },
  { code: "HK-KC", keywords: ["九龍城", "紅磡", "土瓜灣", "何文田", "啟德", "九龍塘", "hung hom", "to kwa wan", "ho man tin", "kai tak", "kowloon city", "kowloon tong"] },
  { code: "HK-WTS", keywords: ["黃大仙", "鑽石山", "新蒲崗", "樂富", "慈雲山", "wong tai sin", "diamond hill", "san po kong", "lok fu", "tsz wan shan"] },
  { code: "HK-KT", keywords: ["觀塘", "牛頭角", "九龍灣", "藍田", "油塘", "秀茂坪", "kwun tong", "ngau tau kok", "kowloon bay", "lam tin", "yau tong", "sau mau ping", "telford plaza"] },
  { code: "HK-CW", keywords: ["中環", "上環", "西環", "西營盤", "堅尼地城", "金鐘", "半山", "central", "sheung wan", "sai wan", "sai ying pun", "kennedy town", "admiralty", "mid-levels"] },
  { code: "HK-WC", keywords: ["灣仔", "銅鑼灣", "跑馬地", "大坑", "wan chai", "causeway bay", "happy valley", "tai hang", "emperor group centre"] },
  { code: "HK-EA", keywords: ["北角", "鰂魚涌", "太古", "西灣河", "筲箕灣", "柴灣", "小西灣", "炮台山", "天后", "north point", "quarry bay", "taikoo", "sai wan ho", "shau kei wan", "chai wan", "siu sai wan", "fortress hill", "tin hau"] },
  { code: "HK-SO", keywords: ["香港仔", "黃竹坑", "鴨脷洲", "赤柱", "淺水灣", "薄扶林", "aberdeen", "wong chuk hang", "ap lei chau", "stanley", "repulse bay", "pok fu lam", "port centre"] },
  { code: "HK-KTQ", keywords: ["葵涌", "葵芳", "青衣", "荔景", "kwai chung", "kwai fong", "tsing yi", "lai king"] },
  { code: "HK-TW", keywords: ["荃灣", "汀九", "深井", "珀麗灣", "馬灣", "tsuen wan", "ting kau", "sham tseng", "park island", "ma wan", "kolour"] },
  { code: "HK-TM", keywords: ["屯門", "龍門", "tuen mun", "lung mun"] },
  { code: "HK-YL", keywords: ["元朗", "天水圍", "yoho", "yuen long", "tin shui wai"] },
  { code: "HK-N", keywords: ["上水", "粉嶺", "sheung shui", "fanling"] },
  { code: "HK-TP", keywords: ["大埔", "太和", "tai po", "tai wo"] },
  { code: "HK-ST", keywords: ["沙田", "大圍", "馬鞍山", "火炭", "石門", "科學園", "sha tin", "shatin", "tai wai", "ma on shan", "fo tan", "shek mun", "science park", "mostown", "new town plaza", "the wai"] },
  { code: "HK-SK", keywords: ["將軍澳", "西貢", "坑口", "寶琳", "調景嶺", "康城", "tseung kwan o", "sai kung", "hang hau", "po lam", "tiu keng leng", "lohas"] },
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
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function loadDetailsFile(filePath, limit) {
  const raw = await readFile(path.resolve(process.cwd(), filePath), "utf8");
  const payload = JSON.parse(raw);

  if (!Array.isArray(payload) || payload.some((item) => typeof item !== "object" || item === null)) {
    throw new Error(`Expected an array of branch detail objects in ${filePath}`);
  }

  const details = payload.map((item) => ({
    url: getString(item.url),
    zh_url: getString(item.zh_url),
    title: getString(item.title),
    title_zh: getString(item.title_zh),
    address: getString(item.address),
    address_zh: getString(item.address_zh),
    phone: getString(item.phone),
    email: getString(item.email),
    is_active: typeof item.is_active === "boolean" ? item.is_active : true,
  }));

  const invalid = details.find((item) => !item.url || !item.title);
  if (invalid) {
    throw new Error(`Each detail object in ${filePath} must include at least url and title`);
  }

  return limit ? details.slice(0, Number(limit)) : details;
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
