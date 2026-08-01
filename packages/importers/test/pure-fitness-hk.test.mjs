import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildRowsFromDetails,
  extractClubUrls,
  extractPrimaryPlaceJson,
  mapClubToGymRow,
  parseAddressOverrides,
  parseArgs,
  parseClubHtml,
  runImporter,
  upsertRows,
} from "../../../scripts/import-pure-fitness-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");
const enUrl = "https://www.pure-360.com.hk/en/clubs/ifc/";
const zhUrl = "https://www.pure-360.com.hk/tc/clubs/ifc/";

async function loadHtmlFixture(name) {
  return readFile(
    new URL(`./fixtures/pure-fitness-hk/${name}`, import.meta.url),
    "utf8"
  );
}

async function loadBilingualDetail() {
  const [enHtml, zhHtml] = await Promise.all([
    loadHtmlFixture("club-en.html"),
    loadHtmlFixture("club-zh.html"),
  ]);
  const en = parseClubHtml(enHtml, enUrl, "en");
  const zh = parseClubHtml(zhHtml, zhUrl, "zh");

  return {
    url: en.url,
    url_zh: zh.url,
    branch_code: en.branch_code ?? zh.branch_code,
    title: en.title,
    title_zh: zh.title,
    name: en.name,
    name_zh: zh.name,
    address: en.address,
    address_zh: zh.address,
    contact_phone: en.contact_phone ?? zh.contact_phone,
    lat: en.lat ?? zh.lat,
    lng: en.lng ?? zh.lng,
    is_fitness: en.is_fitness,
    is_active: en.is_active,
    amenities: en.amenities,
    amenities_zh: zh.amenities,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PURE Fitness argument parsing", () => {
  it("parses fixture, output, limit, geocode, and explicit upsert options", () => {
    expect(
      parseArgs([
        "--address-overrides", "addresses.json",
        "--details-file", "details.json",
        "--details-out", "raw.json",
        "--district-overrides", "districts.json",
        "--limit", "2",
        "--out", "rows.json",
        "--skip-geocode",
        "--upsert",
      ])
    ).toEqual({
      "address-overrides": "addresses.json",
      "details-file": "details.json",
      "details-out": "raw.json",
      "district-overrides": "districts.json",
      limit: "2",
      out: "rows.json",
      "skip-geocode": true,
      upsert: true,
    });
  });

  it.each([
    [["--unknown"], "Unknown argument: --unknown"],
    [["--out"], "Missing value for --out"],
    [["details.json"], "Unexpected positional argument: details.json"],
  ])("rejects malformed arguments %j", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });
});

describe("PURE Fitness raw HTML parsing", () => {
  it("extracts, filters, deduplicates, normalizes, and sorts club links", async () => {
    const html = await loadHtmlFixture("list-en.html");

    expect(extractClubUrls(html)).toEqual([
      "https://www.pure-360.com.hk/en/clubs/ifc/",
      "https://www.pure-360.com.hk/en/clubs/langham-place/",
    ]);
  });

  it("extracts structured English club fields and amenities", async () => {
    const detail = parseClubHtml(await loadHtmlFixture("club-en.html"), enUrl, "en");

    expect(detail).toEqual({
      url: enUrl,
      title: "IFC Fitness Club in Central",
      name: "IFC Fitness Club in Central",
      address: "Shop 1201, IFC Mall, Central, Hong Kong",
      branch_code: "IFC",
      contact_phone: "+85281234567",
      lat: 22.285,
      lng: 114.158,
      is_fitness: true,
      is_active: true,
      amenities: ["Free Weight Equipment", "Cardio Equipment"],
    });
  });

  it("uses visible HTML as a fallback when JSON-LD is absent", async () => {
    const detail = parseClubHtml(await loadHtmlFixture("club-zh.html"), zhUrl, "zh");

    expect(detail).toMatchObject({
      name: "國際金融中心（健身）",
      address: "香港中環金融街8號國際金融中心商場1201號舖",
      contact_phone: "+85281234567",
      lat: null,
      lng: null,
      is_fitness: true,
      amenities: ["自由重量器材", "帶氧運動器材"],
    });
  });

  it("ignores malformed JSON-LD blocks", () => {
    expect(extractPrimaryPlaceJson('<script type="application/ld+json">{bad</script>')).toBeNull();
  });
});

describe("PURE Fitness fixture mapping and validation", () => {
  it("maps bilingual HTML output to a deterministic normalized row", async () => {
    const detail = await loadBilingualDetail();
    const row = mapClubToGymRow(detail, {}, fixedNow);

    expect(row).toMatchObject({
      name: "PURE Fitness IFC",
      name_zh: "PURE Fitness 國際金融中心（健身）",
      slug: "pure-fitness-ifc-ifc",
      address: "Shop 1201, IFC Mall, Central, Hong Kong",
      address_zh: "香港中環金融街8號國際金融中心商場1201號舖",
      district_code: "HK-CW",
      country_code: "HK",
      website_url: enUrl,
      contact_phone: "+85281234567",
      lat: 22.285,
      lng: 114.158,
      is_active: true,
      data_source: "import",
      last_reported_at: "2026-08-01T04:00:00.000Z",
      rack_count: null,
      has_washroom: null,
      has_bathroom: null,
      equipment_notes: "Amenities listed by PURE: Free Weight Equipment, Cardio Equipment",
    });
  });

  it("filters non-fitness pages and sorts rows by slug", async () => {
    const detail = await loadBilingualDetail();
    const second = {
      ...detail,
      url: "https://www.pure-360.com.hk/en/clubs/admiralty/",
      branch_code: "ADM",
      name: "Admiralty Fitness Club in Hong Kong",
      address: "Admiralty, Hong Kong",
    };
    const rows = buildRowsFromDetails([
      detail,
      { ...detail, url: "https://example.test/yoga/", is_fitness: false },
      second,
    ], {}, fixedNow);

    expect(rows.map(({ slug }) => slug)).toEqual([
      "pure-fitness-admiralty-adm",
      "pure-fitness-ifc-ifc",
    ]);
  });

  it("applies Chinese address overrides by branch code, URL, then slug", async () => {
    const detail = await loadBilingualDetail();
    const overrides = {
      IFC: { address_zh: "Branch address" },
      [enUrl]: { address_zh: "URL address" },
      "pure-fitness-ifc-ifc": { address_zh: "Slug address" },
    };

    expect(mapClubToGymRow(detail, {}, fixedNow, overrides).address_zh).toBe(
      "Branch address"
    );

    delete overrides.IFC;
    expect(mapClubToGymRow(detail, {}, fixedNow, overrides).address_zh).toBe(
      "URL address"
    );

    delete overrides[enUrl];
    expect(mapClubToGymRow(detail, {}, fixedNow, overrides).address_zh).toBe(
      "Slug address"
    );
  });

  it("validates and trims Chinese address override files", () => {
    expect(
      parseAddressOverrides({ KIN: { address_zh: "  中文地址  " } })
    ).toEqual({ KIN: { address_zh: "中文地址" } });

    expect(() => parseAddressOverrides([])).toThrow("JSON object");
    expect(() => parseAddressOverrides({ KIN: "中文地址" })).toThrow(
      "expected an object"
    );
    expect(() =>
      parseAddressOverrides({ KIN: { address_zh: "" } })
    ).toThrow("non-empty string");
    expect(() =>
      parseAddressOverrides({ KIN: { address_zh: "中文地址", address: "English" } })
    ).toThrow("unknown field address");
  });

  it.each([
    [[], "did not contain any clubs"],
    [[{ url: "https://example.test/yoga", is_fitness: false }], "any fitness clubs"],
    [[{ is_fitness: true, name: "Central", address: "Central" }], "required source URL"],
  ])("rejects invalid detail fixtures", (details, message) => {
    expect(() => buildRowsFromDetails(details, {}, fixedNow)).toThrow(message);
  });

  it("rejects duplicate source URLs", async () => {
    const detail = await loadBilingualDetail();
    expect(() => buildRowsFromDetails([detail, detail], {}, fixedNow)).toThrow(
      "duplicate source URLs"
    );
  });

  it("rejects unknown districts and duplicate normalized slugs", async () => {
    const detail = await loadBilingualDetail();
    expect(() => buildRowsFromDetails([
      { ...detail, address: "Unknown location", address_zh: null, name: "Alpha", name_zh: null },
    ], {}, fixedNow)).toThrow("Could not infer district_code for 1 gyms");

    expect(() => buildRowsFromDetails([
      detail,
      { ...detail, url: `${enUrl}duplicate/` },
    ], {}, fixedNow)).toThrow("duplicate gym slugs");
  });
});

describe("PURE Fitness injected runner", () => {
  it("uses fixture input without fetching, geocoding, or upserting during dry run", async () => {
    const details = [await loadBilingualDetail()];
    const fetchDetails = vi.fn(() => { throw new Error("must not fetch"); });
    const geocode = vi.fn();
    const writeRows = vi.fn();
    const persistRows = vi.fn();
    const log = vi.fn();

    const result = await runImporter(
      { "details-file": "fixture.json", out: "rows.json" },
      {
        loadDetailsFile: vi.fn().mockResolvedValue(details),
        fetchClubDetailsFromSite: fetchDetails,
        createMapboxGeocoder: vi.fn(() => geocode),
        writeRows,
        upsertRows: persistRows,
        now: () => fixedNow,
        cwd: () => "/tmp/gymory-pure-test",
        log,
      }
    );

    expect(fetchDetails).not.toHaveBeenCalled();
    expect(geocode).not.toHaveBeenCalled();
    expect(persistRows).not.toHaveBeenCalled();
    expect(writeRows).toHaveBeenCalledWith("/tmp/gymory-pure-test/rows.json", result.rows);
    expect(result).toMatchObject({ upserted: false, rows: { length: 1 } });
    expect(log).toHaveBeenLastCalledWith("Dry run only. Pass --upsert to write to Supabase.");
  });

  it("loads and applies an address override file", async () => {
    const details = [await loadBilingualDetail()];
    const loadAddressOverrides = vi.fn().mockResolvedValue({
      IFC: { address_zh: "中環蘇豪荷李活道32號建業榮基中心3樓" },
    });
    const writeRows = vi.fn();

    const result = await runImporter(
      {
        "address-overrides": "addresses.json",
        "details-file": "fixture.json",
        "skip-geocode": true,
      },
      {
        loadAddressOverrides,
        loadDetailsFile: vi.fn().mockResolvedValue(details),
        createMapboxGeocoder: vi.fn(() => null),
        writeRows,
        now: () => fixedNow,
        cwd: () => "/tmp/gymory-pure-test",
        log: vi.fn(),
      }
    );

    expect(loadAddressOverrides).toHaveBeenCalledWith("addresses.json");
    expect(result.rows[0].address_zh).toBe(
      "中環蘇豪荷李活道32號建業榮基中心3樓"
    );
  });

  it("refuses an upsert when database credentials are missing", async () => {
    await expect(upsertRows([], {})).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for --upsert"
    );
  });
});
