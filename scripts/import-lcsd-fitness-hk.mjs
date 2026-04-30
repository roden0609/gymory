#!/usr/bin/env node

/**
 * Build a Gymory listing baseline from LCSD Hong Kong fitness room pages.
 *
 * LCSD publishes facility names, addresses, phones, and detail URLs in both
 * English and Traditional Chinese. This importer maps those records into the
 * Gymory schema and leaves equipment fields as null.
 *
 * Usage:
 *   node scripts/import-lcsd-fitness-hk.mjs
 *   node scripts/import-lcsd-fitness-hk.mjs --out data/imports/lcsd-fitness-hk-baseline.json
 *   node scripts/import-lcsd-fitness-hk.mjs --details-out data/imports/raw-lcsd-fitness-hk-details.json
 *   node scripts/import-lcsd-fitness-hk.mjs --details-file data/imports/raw-lcsd-fitness-hk-details.json
 *   node scripts/import-lcsd-fitness-hk.mjs --upsert
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { upsertGymsWithSubmissions } from "./lib/upsert-gyms-with-submissions.mjs";

await loadEnvFiles(["apps/web/.env.dev"]);
// await loadEnvFiles(["apps/web/.env.prod"]);

const LIST_URL_EN = "https://www.lcsd.gov.hk/clpss/en/webApp/FitnessRooms.do";
const LIST_URL_ZH = "https://www.lcsd.gov.hk/clpss/tc/webApp/FitnessRooms.do";
const SOURCE_URL = LIST_URL_EN;
const BASE_URL = "https://www.lcsd.gov.hk";

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
    : await fetchFitnessRoomDetailsFromSite();

  if (args["details-out"]) {
    const detailsOutPath = path.resolve(process.cwd(), args["details-out"]);
    await mkdir(path.dirname(detailsOutPath), { recursive: true });
    await writeFile(detailsOutPath, `${JSON.stringify(details, null, 2)}\n`);
    console.log(`Wrote ${details.length} LCSD detail snapshots to ${detailsOutPath}`);
  }

  const rows = details
    .map((detail) => mapFacilityToGymRow(detail, districtOverrides))
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
        "Add overrides with --district-overrides <json>. Keys can be facility IDs or slugs.",
        examples,
      ].join("\n")
    );
  }

  const outPath = path.resolve(
    process.cwd(),
    args.out ?? "data/imports/lcsd-fitness-hk-baseline.json"
  );
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`);

  console.log(`Wrote ${rows.length} LCSD Fitness Rooms baseline rows to ${outPath}`);

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

async function fetchHtml(url) {
  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "gymory-importer/1.0 (+https://gymory.io)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Failed ${url}: ${response.status} ${text.slice(0, 300)}`);
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function fetchFitnessRoomDetailsFromSite() {
  const [htmlEn, htmlZh] = await Promise.all([fetchHtml(LIST_URL_EN), fetchHtml(LIST_URL_ZH)]);

  const recordsEn = extractFacilityRows(htmlEn, "en");
  const recordsZh = extractFacilityRows(htmlZh, "zh");

  const mapZhById = new Map(recordsZh.map((row) => [row.id, row]));
  const mapEnById = new Map(recordsEn.map((row) => [row.id, row]));

  const ids = Array.from(new Set([...mapEnById.keys(), ...mapZhById.keys()]));
  const limitedIds = args.limit ? ids.slice(0, Number(args.limit)) : ids;

  const baseDetails = limitedIds.map((id) => {
    const en = mapEnById.get(id) ?? null;
    const zh = mapZhById.get(id) ?? null;
    return {
      id,
      name: en?.name ?? null,
      name_zh: zh?.name ?? null,
      address: en?.address ?? null,
      address_zh: zh?.address ?? null,
      phone: en?.phone ?? zh?.phone ?? null,
      district_en: en?.district ?? null,
      district_zh: zh?.district ?? null,
      detail_url_en: en?.detail_url ?? null,
      detail_url_zh: zh?.detail_url ?? null,
      is_accessible_shared: Boolean(en?.is_accessible_shared || zh?.is_accessible_shared),
      is_active: inferIsActiveFromNotice(en, zh, htmlEn, htmlZh),
    };
  });

  const details = [];
  for (const detail of baseDetails) {
    const detailSnapshot = await fetchFacilityDetailSnapshot(detail);
    details.push({
      ...detail,
      ...detailSnapshot,
    });
  }

  return details;
}

function extractFacilityRows(html, lang) {
  const rows = [];
  const tableRegex = /<table class="table table-responsive fitness_tb">([\s\S]*?)<\/table>/g;

  for (const tableMatch of html.matchAll(tableRegex)) {
    const tableHtml = tableMatch[1];
    const districtMatch = tableHtml.match(/<thead>[\s\S]*?<b>([^<]+)<\/b>/i);
    const district = cleanText(districtMatch?.[1] ?? null);

    const rowRegex =
      /<tr>[\s\S]*?<td class="venu">([\s\S]*?)<\/td>[\s\S]*?<td class="addr">([\s\S]*?)<\/td>[\s\S]*?<td class="tel">([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="detail"[^>]*>[\s\S]*?<a href="([^"]*FitnessRoomDetails\.do\?id=(\d+))"[^>]*>(?:Details|詳情)<\/a>(\*)?[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi;

    for (const match of tableHtml.matchAll(rowRegex)) {
      const relativeUrl = cleanText(match[4]);
      rows.push({
        id: String(match[5]),
        lang,
        district,
        name: cleanText(match[1]),
        address: cleanText(match[2]),
        phone: normalizePhone(match[3]),
        detail_url: relativeUrl ? new URL(relativeUrl, BASE_URL).toString() : null,
        is_accessible_shared: match[6] === "*",
      });
    }
  }

  if (rows.length === 0) {
    throw new Error(`Could not extract facility rows from LCSD ${lang} page`);
  }

  return rows;
}

function inferIsActiveFromNotice(recordEn, recordZh, htmlEn, htmlZh) {
  const noticeEn = extractAlertMessage(htmlEn);
  const noticeZh = extractAlertMessage(htmlZh);

  const nameEn = recordEn?.name;
  const nameZh = recordZh?.name;

  const hasClosureMarker = (notice) => /(temporarily closed|closed|暫停開放|關閉)/i.test(notice);
  const mentionsFacility = (notice, candidate) => {
    if (!notice || !candidate) return false;
    return notice.toLowerCase().includes(candidate.toLowerCase());
  };

  if (hasClosureMarker(noticeEn) && (mentionsFacility(noticeEn, nameEn) || mentionsFacility(noticeEn, nameZh))) {
    return false;
  }
  if (hasClosureMarker(noticeZh) && (mentionsFacility(noticeZh, nameZh) || mentionsFacility(noticeZh, nameEn))) {
    return false;
  }

  return true;
}

function extractAlertMessage(html) {
  const match = html.match(/<div class="alert-message"[\s\S]*?<\/div>/i);
  if (!match) return "";
  return cleanText(match[0]) ?? "";
}

async function fetchFacilityDetailSnapshot(detail) {
  const htmlEn = detail.detail_url_en ? await fetchHtml(detail.detail_url_en) : null;
  const htmlZh = detail.detail_url_zh ? await fetchHtml(detail.detail_url_zh) : null;
  return {
    size_sqm: extractSizeSqm(htmlEn, htmlZh),
    equipment_items: extractEquipmentItems(htmlEn, htmlZh),
  };
}

function extractSizeSqm(htmlEn, htmlZh) {
  const patterns = [
    /Size of Fitness Room\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*m/i,
    /健身室面積\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*平方米/i,
  ];
  const candidates = [htmlEn, htmlZh].filter(Boolean);
  for (const html of candidates) {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function extractEquipmentItems(htmlEn, htmlZh) {
  const items = [];
  const equipmentSectionRegexes = [
    /Fitness Equipment Provided in Fitness Room[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i,
    /健身室器械[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i,
  ];
  const tableHtml = extractEquipmentTableHtml(htmlEn, equipmentSectionRegexes)
    ?? extractEquipmentTableHtml(htmlZh, equipmentSectionRegexes);
  if (!tableHtml) return [];

  const rowRegex = /<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  for (const match of tableHtml.matchAll(rowRegex)) {
    const name = cleanText(match[1]);
    const countText = cleanText(match[2]);
    if (!name || !countText) continue;
    if (/^(Equipment|No\.|器械|數目)$/i.test(name)) continue;
    const count = toNumber(countText.replace(/[^0-9.]/g, ""));
    if (count === null) continue;
    items.push({ name, count });
  }

  return dedupeEquipmentItems(items);
}

function extractEquipmentTableHtml(html, regexes) {
  if (!html) return null;
  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

function dedupeEquipmentItems(items) {
  const merged = new Map();
  for (const item of items) {
    const key = normalizeComparableEquipmentName(item.name);
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing || item.count > existing.count) {
      merged.set(key, item);
    }
  }
  return Array.from(merged.values());
}

function mapFacilityToGymRow(detail, districtOverrides) {
  const title = detail.name ?? detail.name_zh ?? `LCSD Fitness Room ${detail.id}`;
  const slug = toSlug(["lcsd", title, detail.id].filter(Boolean).join(" "));
  const prefixedName = ensurePrefix(title, "LCSD ");
  const prefixedNameZh = detail.name_zh ? ensurePrefix(detail.name_zh, "康文署") : null;

  const districtText = [
    detail.name,
    detail.name_zh,
    detail.address,
    detail.address_zh,
    detail.district_en,
    detail.district_zh,
  ]
    .filter(Boolean)
    .join(" ");

  const equipment = mapEquipmentToSchema(detail.equipment_items ?? []);
  const estimatedSizeSqft =
    detail.size_sqm !== null && detail.size_sqm !== undefined
      ? Math.round(detail.size_sqm * 10.76391041671)
      : null;

  return {
    name: prefixedName,
    name_zh: prefixedNameZh,
    slug,
    address: detail.address ?? null,
    address_zh: detail.address_zh ?? null,
    district_code:
      districtOverrides[String(detail.id)] ??
      districtOverrides[slug] ??
      inferDistrictCode(districtText),
    country_code: "HK",
    website_url: detail.detail_url_en ?? detail.detail_url_zh ?? SOURCE_URL,
    contact_phone: normalizePhone(detail.phone),
    lat: null,
    lng: null,
    estimated_size_sqft: estimatedSizeSqft,
    is_active: detail.is_active ?? true,
    data_source: "import",
    last_reported_at: new Date().toISOString(),
    ...buildNullEquipmentFields(),
    ...equipment,
  };
}

function ensurePrefix(value, prefix) {
  const text = getString(value);
  if (!text) return value;
  return text.startsWith(prefix) ? text : `${prefix}${text}`;
}

function mapEquipmentToSchema(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      equipment_notes: null,
      equipment_last_verified_at: null,
    };
  }

  let treadmillCount = 0;
  let exerciseBikeCount = 0;
  let rowerCount = 0;
  let climberCount = 0;
  let skiErgCount = 0;
  let latPulldownCount = 0;
  let chestPressCount = 0;
  let legPressCount = 0;
  let benchCount = 0;
  let cableMachineCount = 0;
  let smithMachineCount = 0;
  let dumbbellMaxKg = null;

  let hasSmithMachine = false;
  let hasPullUpBar = false;
  let hasDipStation = false;
  let hasLatPulldownMachine = false;
  let hasChestPressMachine = false;
  let hasLegPressMachine = false;
  let hasLegExtensionMachine = false;
  let hasSeatedLegCurlMachine = false;
  let hasLyingLegCurlMachine = false;
  let hasBackExtensionMachine = false;
  let hasHipAbductorMachine = false;
  let hasHipAdductorMachine = false;
  let hasShoulderPressMachine = false;
  let hasLateralRaiseMachine = false;
  let hasMultiPressMachine = false;
  let hasMultiHipMachine = false;
  let hasStretchingMachine = false;
  let hasEllipticalMachine = false;
  let hasPecDeckMachine = false;
  let hasChestFlyMachine = false;
  let hasBicepCurlMachine = false;
  let hasTricepExtensionMachine = false;
  let hasKettlebell = false;
  let hasMedicineBall = false;

  const unmatched = [];

  for (const item of items) {
    const normalized = normalizeComparableEquipmentName(item.name);
    const canonical = canonicalizeEquipmentName(normalized);
    const count = toNumber(item.count);
    if (!normalized || !canonical || count === null) continue;

    const detectedMaxKg = detectDumbbellMaxKg(item.name);
    if (detectedMaxKg !== null) {
      dumbbellMaxKg = dumbbellMaxKg === null ? detectedMaxKg : Math.max(dumbbellMaxKg, detectedMaxKg);
    }

    let matched = false;

    if (/\btreadmill\b|跑步機/.test(canonical)) {
      treadmillCount += count;
      matched = true;
    }
    if (/\bbike\b|cycle|單車|靠背式單車/.test(canonical) && !/assault/.test(canonical)) {
      exerciseBikeCount += count;
      matched = true;
    }
    if (/rower|rowing machine|rowing ergometer|rowing|划艇機/.test(canonical)) {
      rowerCount += count;
      matched = true;
    }
    if (/stair climber|stairmaster|stepping machine|stepper|climber|橢圓|elliptical|cross trainer|arc trainer/.test(canonical)) {
      climberCount += count;
      if (/elliptical|cross trainer|arc trainer|橢圓/.test(canonical)) {
        hasEllipticalMachine = true;
      }
      matched = true;
    }
    if (/lat pull|lat pulldown|pull down|pull-down|pulldown|高拉力/.test(canonical)) {
      latPulldownCount += count;
      hasLatPulldownMachine = true;
      matched = true;
    }
    if (/lat row|lat \/ row|traditional lat row|multi lat machine/.test(canonical)) {
      hasLatPulldownMachine = true;
      matched = true;
    }
    if (/chest press|chess press|推胸/.test(canonical)) {
      chestPressCount += count;
      hasChestPressMachine = true;
      matched = true;
    }
    if (/leg press|推腿|撐腿/.test(canonical)) {
      legPressCount += count;
      hasLegPressMachine = true;
      matched = true;
    }
    if (/bench/.test(canonical) && !/abdominal|crunch|dip/.test(canonical)) {
      benchCount += count;
      matched = true;
    }
    if (/cable crossover|pulley|functional trainer|multi functional trainer|erocolina|traditional lat row|dual adjustable pulley/.test(canonical)) {
      cableMachineCount += count;
      matched = true;
    }
    if (/smith/.test(canonical)) {
      smithMachineCount += count;
      hasSmithMachine = true;
      matched = true;
    }
    if (/chin up|chinning bar|chin up frame|pull up|wall bar/.test(canonical)) {
      hasPullUpBar = true;
      matched = true;
    }
    if (/dip/.test(canonical)) {
      hasDipStation = true;
      matched = true;
    }
    if (/leg extension|knee extension|提腿|屈腿/.test(canonical)) {
      hasLegExtensionMachine = true;
      matched = true;
    }
    if (/seated leg curl|seated knee flexion/.test(canonical)) {
      hasSeatedLegCurlMachine = true;
      matched = true;
    } else if (/leg curl/.test(canonical)) {
      hasLyingLegCurlMachine = true;
      matched = true;
    }
    if (/back extension|standing back hyperextension|ab low back|lower back|後腰|back machine|back raise/.test(canonical)) {
      hasBackExtensionMachine = true;
      matched = true;
    }
    if (/hip abduction|abductor|inner outer thigh|outer thigh|multi hip|rotary hip/.test(canonical)) {
      hasHipAbductorMachine = true;
      if (/multi hip/.test(canonical)) hasMultiHipMachine = true;
      matched = true;
    }
    if (/hip adduction|adductor|inner outer thigh|dual inner|multi hip|rotary hip/.test(canonical)) {
      hasHipAdductorMachine = true;
      if (/multi hip/.test(canonical)) hasMultiHipMachine = true;
      matched = true;
    }
    if (/shoulder press|overhead press|推膊|chest shoulder press/.test(canonical)) {
      hasShoulderPressMachine = true;
      matched = true;
    }
    if (/deltoid raise|lateral raise/.test(canonical)) {
      hasLateralRaiseMachine = true;
      matched = true;
    }
    if (/multi press/.test(canonical)) {
      hasMultiPressMachine = true;
      matched = true;
    }
    if (/pec fly|rear fly|butterfly|蝴蝶式胸肌|pectoral fly|fly/.test(canonical)) {
      hasPecDeckMachine = true;
      hasChestFlyMachine = true;
      matched = true;
    }
    if (/bicep|arm curl|scott curl/.test(canonical)) {
      hasBicepCurlMachine = true;
      matched = true;
    }
    if (/tricep|arm extension/.test(canonical)) {
      hasTricepExtensionMachine = true;
      matched = true;
    }
    if (/kettleball|kettlebell/.test(canonical)) {
      hasKettlebell = true;
      matched = true;
    }
    if (/medicine ball|fitball/.test(canonical)) {
      hasMedicineBall = true;
      matched = true;
    }
    if (/abdominal|crunch|sit up board|leg raise|knee raise station|torso rotation|rotary torso|vertical knee raise|leg raise chair/.test(canonical)) {
      matched = true;
    }
    if (/stretch trainer|stretch machine|stretcher|body stretch|trebistretch/.test(canonical)) {
      hasStretchingMachine = true;
      matched = true;
    }
    if (/scale|digital weight scale/.test(canonical)) {
      matched = true;
    }
    if (/skierg indoor skiing machine|ski erg|ski-erg|skierg/.test(canonical)) {
      skiErgCount += count;
      matched = true;
    }
    if (/upper body ergometer|krank cycle|natural runner/.test(canonical)) {
      matched = true;
    }
    if (/dumbbell/.test(canonical)) {
      matched = true;
    }
    if (/barbell/.test(canonical)) {
      matched = true;
    }

    if (!matched) {
      unmatched.push(`${item.name} x${count}`);
    }
  }

  return {
    bench_count: benchCount > 0 ? benchCount : null,
    treadmill_count: treadmillCount > 0 ? treadmillCount : null,
    exercise_bike_count: exerciseBikeCount > 0 ? exerciseBikeCount : null,
    rower_count: rowerCount > 0 ? rowerCount : null,
    climber_count: climberCount > 0 ? climberCount : null,
    ski_erg_count: skiErgCount > 0 ? skiErgCount : null,
    cable_machine_count: cableMachineCount > 0 ? cableMachineCount : null,
    lat_pulldown_count: latPulldownCount > 0 ? latPulldownCount : null,
    chest_press_count: chestPressCount > 0 ? chestPressCount : null,
    leg_press_count: legPressCount > 0 ? legPressCount : null,
    smith_machine_count: smithMachineCount > 0 ? smithMachineCount : null,
    has_smith_machine: hasSmithMachine ? true : null,
    has_pull_up_bar: hasPullUpBar ? true : null,
    has_dip_station: hasDipStation ? true : null,
    has_lat_pulldown_machine: hasLatPulldownMachine ? true : null,
    has_chest_press_machine: hasChestPressMachine ? true : null,
    has_leg_press_machine: hasLegPressMachine ? true : null,
    has_leg_extension_machine: hasLegExtensionMachine ? true : null,
    has_seated_leg_curl_machine: hasSeatedLegCurlMachine ? true : null,
    has_lying_leg_curl_machine: hasLyingLegCurlMachine ? true : null,
    has_back_extension_machine: hasBackExtensionMachine ? true : null,
    has_hip_abductor_machine: hasHipAbductorMachine ? true : null,
    has_hip_adductor_machine: hasHipAdductorMachine ? true : null,
    has_lateral_raise_machine: hasLateralRaiseMachine ? true : null,
    has_multi_press_machine: hasMultiPressMachine ? true : null,
    has_multi_hip_machine: hasMultiHipMachine ? true : null,
    has_stretching_machine: hasStretchingMachine ? true : null,
    has_elliptical_machine: hasEllipticalMachine ? true : null,
    has_shoulder_press_machine: hasShoulderPressMachine ? true : null,
    has_pec_deck_machine: hasPecDeckMachine ? true : null,
    has_chest_fly_machine: hasChestFlyMachine ? true : null,
    has_bicep_curl_machine: hasBicepCurlMachine ? true : null,
    has_tricep_extension_machine: hasTricepExtensionMachine ? true : null,
    has_kettlebell: hasKettlebell ? true : null,
    has_medicine_ball: hasMedicineBall ? true : null,
    dumbbell_max_weight_kg: dumbbellMaxKg,
    equipment_notes: unmatched.length > 0 ? `Unmapped LCSD equipment: ${unmatched.join("; ")}` : null,
    equipment_last_verified_at: new Date().toISOString(),
  };
}

function canonicalizeEquipmentName(normalized) {
  if (!normalized) return normalized;

  return normalized
    .replace(/\brecumbent cycle\b/g, "recumbent bike")
    .replace(/\bupright cycle\b/g, "upright bike")
    .replace(/\bupright bikes\b/g, "upright bike")
    .replace(/\bfly\s*\/\s*rear delt\b/g, "pec fly rear fly")
    .replace(/\bfly\/rear delt\b/g, "pec fly rear fly")
    .replace(/\brotary torso machine\b/g, "torso rotation")
    .replace(/\brotary torso\b/g, "torso rotation")
    .replace(/\barm curl machine\b/g, "arm curl")
    .replace(/\barm curl \/ extension\b/g, "arm curl tricep")
    .replace(/\barm curl \/ arm extension machine\b/g, "arm curl tricep")
    .replace(/\binner\s*\/\s*outer thigh machine\b/g, "inner outer thigh")
    .replace(/\binner\/outer thigh machine\b/g, "inner outer thigh")
    .replace(/\bdual inner\b/g, "dual inner")
    .replace(/\bouter thigh\b/g, "outer thigh")
    .replace(/\btroso rotation\b/g, "torso rotation")
    .replace(/\bkeen raise station\b/g, "knee raise station")
    .replace(/\blet extension \/ curl\b/g, "leg extension leg curl")
    .replace(/\bdeltoid raise machine\b/g, "deltoid raise")
    .replace(/\bdeltoid raise\b/g, "lateral raise")
    .replace(/\bmulti-functional muscle trainer\b/g, "multi functional trainer")
    .replace(/\bmulti-functional muscle trainers\b/g, "multi functional trainer")
    .replace(/\bmulti-press machine\b/g, "multi press machine")
    .replace(/\bmulti-press\b/g, "multi press machine")
    .replace(/\bmulti press\b/g, "multi press machine")
    .replace(/\brow\/ rear delt\b/g, "rear fly")
    .replace(/\brear\/ delt row\b/g, "rear fly")
    .replace(/\brow rear delt\b/g, "rear fly")
    .replace(/\blat \/ row\b/g, "lat row")
    .replace(/\btraditional lat\/row\b/g, "traditional lat row")
    .replace(/\btraditional lat \/ row\b/g, "traditional lat row")
    .replace(/\bdual traditional lat\/row\b/g, "traditional lat row")
    .replace(/\bmulti-lat machine\b/g, "multi lat machine")
    .replace(/\bpulldown\b/g, "lat pulldown")
    .replace(/\bpull down\b/g, "lat pulldown")
    .replace(/\bstepping machine\b/g, "stepper")
    .replace(/\bstretch machine\b/g, "stretch trainer")
    .replace(/\bstretching machine\b/g, "stretch trainer")
    .replace(/\bstretcher trainer\b/g, "stretch trainer")
    .replace(/\bstretcher\b/g, "stretch trainer")
    .replace(/\bweighting scale\b/g, "scale")
    .replace(/\bdigital weight scale with height measuring sensor\b/g, "scale")
    .replace(/\bupper body ergometer \*\b/g, "upper body ergometer")
    .replace(/\bkrank cycle \*\b/g, "krank cycle")
    .replace(/\bcross-trainer\b/g, "cross trainer")
    .replace(/\bcrosstrainer\b/g, "cross trainer")
    .replace(/\bmulti-hip machine\b/g, "multi hip")
    .replace(/\bmulti-hip station\b/g, "multi hip")
    .replace(/\bmulti-hip\b/g, "multi hip")
    .replace(/\bmulti-hip\b/g, "multi hip")
    .replace(/\bmulti hip\b/g, "multi hip")
    .trim();
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
    has_multi_press_machine: null,
    has_multi_hip_machine: null,
    has_stretching_machine: null,
    has_elliptical_machine: null,
    has_mobility_stick: null,
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
  { code: "HK-KC", keywords: ["九龍城", "紅磡", "土瓜灣", "何文田", "啟德", "九龍塘", "hung hom", "to kwa wan", "ho man tin", "kai tak", "kowloon city", "kowloon tong"] },
  { code: "HK-WTS", keywords: ["黃大仙", "鑽石山", "新蒲崗", "樂富", "慈雲山", "wong tai sin", "diamond hill", "san po kong", "lok fu", "tsz wan shan"] },
  { code: "HK-KT", keywords: ["觀塘", "牛頭角", "九龍灣", "藍田", "油塘", "秀茂坪", "kwun tong", "ngau tau kok", "kowloon bay", "lam tin", "yau tong", "sau mau ping"] },
  { code: "HK-CW", keywords: ["中環", "上環", "西環", "西營盤", "堅尼地城", "金鐘", "半山", "石塘咀", "central", "sheung wan", "sai wan", "sai ying pun", "kennedy town", "admiralty", "mid-levels", "shek tong tsui"] },
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
  { code: "HK-IS", keywords: ["東涌", "離島", "愉景灣", "長洲", "梅窩", "坪洲", "tung chung", "islands", "discovery bay", "cheung chau", "mui wo", "peng chau"] },
];

function cleanText(value) {
  if (!value) return null;
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const num = Number(code);
      return Number.isFinite(num) ? String.fromCharCode(num) : _;
    });
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

function normalizeComparableEquipmentName(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .toLowerCase()
    .replace(/\*/g, " ")
    .replace(/[().,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDumbbellMaxKg(label) {
  const text = normalizeComparableEquipmentName(label);
  if (!text || (!text.includes("dumbbell") && !text.includes("啞鈴"))) return null;

  const kgMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*kg/g));
  if (kgMatches.length > 0) {
    const maxKg = Math.max(...kgMatches.map((match) => Number(match[1])));
    return Number.isFinite(maxKg) ? maxKg : null;
  }

  const lbsMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*lbs?/g));
  if (lbsMatches.length > 0) {
    const maxLbs = Math.max(...lbsMatches.map((match) => Number(match[1])));
    if (!Number.isFinite(maxLbs)) return null;
    return Number((maxLbs * 0.45359237).toFixed(2));
  }

  return null;
}

function normalizePhone(value) {
  const phone = getString(value);
  return phone?.replace(/\s+/g, "") ?? null;
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

  if (!Array.isArray(payload) || payload.some((item) => typeof item !== "object" || item === null)) {
    throw new Error(`Expected an array of LCSD detail objects in ${filePath}`);
  }

  const details = payload.map((item) => ({
    id: item.id === null || item.id === undefined ? null : String(item.id),
    name: getString(item.name),
    name_zh: getString(item.name_zh),
    address: getString(item.address),
    address_zh: getString(item.address_zh),
    phone: getString(item.phone),
    district_en: getString(item.district_en),
    district_zh: getString(item.district_zh),
    detail_url_en: getString(item.detail_url_en),
    detail_url_zh: getString(item.detail_url_zh),
    is_active: typeof item.is_active === "boolean" ? item.is_active : true,
    size_sqm: toNumber(item.size_sqm),
    equipment_items: Array.isArray(item.equipment_items)
      ? item.equipment_items
          .map((equipment) => ({
            name: getString(equipment?.name),
            count: toNumber(equipment?.count),
          }))
          .filter((equipment) => equipment.name && equipment.count !== null)
      : [],
  }));

  const invalid = details.find((item) => !item.id || (!item.name && !item.name_zh));
  if (invalid) {
    throw new Error(`Each detail object in ${filePath} must include id and name/name_zh`);
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
