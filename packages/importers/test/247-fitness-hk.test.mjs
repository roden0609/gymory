import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildStoreDetailBundles,
  buildRowsFromDetails,
  inferDistrictCode,
  mapStoreToGymRow,
  parseArgs,
  parseJsonText,
  parseStoreListPayload,
  runImporter,
  upsertRows,
} from "../../../scripts/import-247-fitness-hk.mjs";

const fixedNow = new Date("2026-07-31T12:00:00.000Z");

async function loadFixture() {
  return JSON.parse(
    await readFile(
      new URL("./fixtures/247-fitness-hk/details.json", import.meta.url),
      "utf8"
    )
  );
}

async function loadJsonFixture(name) {
  return JSON.parse(
    await readFile(
      new URL(`./fixtures/247-fitness-hk/${name}`, import.meta.url),
      "utf8"
    )
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("24/7 Fitness argument parsing", () => {
  it("defaults to dry-run options", () => {
    expect(parseArgs([])).toEqual({});
  });

  it("parses fixture, output, override, limit, and explicit upsert options", () => {
    expect(
      parseArgs([
        "--details-file",
        "details.json",
        "--district-overrides",
        "districts.json",
        "--limit",
        "2",
        "--out",
        "rows.json",
        "--upsert",
      ])
    ).toEqual({
      "details-file": "details.json",
      "district-overrides": "districts.json",
      limit: "2",
      out: "rows.json",
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

describe("24/7 Fitness fixture dry run", () => {
  it("maps, validates, and sorts bilingual rows without network access", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("fixture tests must not fetch"));
    const details = await loadFixture();

    const rows = buildRowsFromDetails(details, {}, fixedNow);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows).toHaveLength(2);
    expect(rows.map(({ slug }) => slug)).toEqual([
      "24-7-fitness-central-200",
      "24-7-fitness-mong-kok-100",
    ]);
    expect(rows[0]).toMatchObject({
      name: "24/7 Fitness Central",
      name_zh: "24/7 Fitness 中環",
      address: "1 Queen's Road Central, Central",
      address_zh: "中環皇后大道中1號",
      district_code: "HK-CW",
      country_code: "HK",
      contact_phone: "21234567",
      lat: 22.2819,
      lng: 114.1585,
      is_active: true,
      data_source: "import",
      last_reported_at: "2026-07-31T12:00:00.000Z",
      rack_count: null,
      has_washroom: null,
    });
    expect(rows[1]).toMatchObject({
      district_code: "HK-YTM",
      is_active: false,
      contact_phone: "23990000",
    });
  });

  it("produces identical output for repeated runs with an injected time", async () => {
    const details = await loadFixture();
    expect(buildRowsFromDetails(details, {}, fixedNow)).toEqual(
      buildRowsFromDetails(details, {}, fixedNow)
    );
  });

  it("accepts an explicit district override by source ID", () => {
    const row = mapStoreToGymRow(
      {
        detailEn: {
          storeId: "999",
          storeName: "Test Club",
          address: "Test address",
        },
        detailZh: null,
        listEn: null,
        listZh: null,
      },
      { 999: "HK-ST" },
      fixedNow
    );

    expect(row.district_code).toBe("HK-ST");
    expect(row.name_zh).toBeNull();
    expect(row.lat).toBeNull();
    expect(row.lng).toBeNull();
  });

  it("normalizes invalid coordinate strings to null", () => {
    const row = mapStoreToGymRow(
      {
        detailEn: {
          storeId: "999",
          storeName: "Test Club",
          address: "Sha Tin",
          latitude: "not-a-number",
          longitude: "Infinity",
        },
      },
      {},
      fixedNow
    );

    expect(row.lat).toBeNull();
    expect(row.lng).toBeNull();
  });

  it("prefers a specific district over Central in a venue name", () => {
    expect(
      inferDistrictCode(
        "Tseung Kwan O Third Branch Shop 2010, MCP Central II, 8 Yan King Road, Tseung Kwan O"
      )
    ).toBe("HK-SK");
  });

  it("fails loudly for an empty or structurally changed fixture", () => {
    expect(() => buildRowsFromDetails([], {}, fixedNow)).toThrow(
      "did not contain any stores"
    );
  });

  it("rejects a detail without a required source identifier", () => {
    expect(() =>
      buildRowsFromDetails(
        [{ detailEn: { storeName: "Mong Kok", address: "Mong Kok" } }],
        {},
        fixedNow
      )
    ).toThrow("missing a required store ID");
  });

  it("rejects duplicate source records", async () => {
    const [detail] = await loadFixture();
    expect(() =>
      buildRowsFromDetails([detail, detail], {}, fixedNow)
    ).toThrow("duplicate store IDs");
  });

  it("fails loudly when a district cannot be resolved", () => {
    expect(() =>
      buildRowsFromDetails(
        [
          {
            detailEn: {
              storeId: "999",
              storeName: "Test Club",
              address: "Unknown place",
            },
          },
        ],
        {},
        fixedNow
      )
    ).toThrow("Could not infer district_code for 1 gyms");
  });
});

describe("24/7 Fitness raw API parsing", () => {
  it("selects only Hong Kong stores from the raw list response", async () => {
    const payload = await loadJsonFixture("list-en.json");
    expect(parseStoreListPayload(payload).map(({ storeId }) => storeId)).toEqual([
      "200",
      "100",
    ]);
  });

  it.each([
    [{}, "countryNodes"],
    [{ data: { countryNodes: [] } }, "Hong Kong areaNodeList"],
    [
      {
        data: {
          countryNodes: [{ countryCode: "HK", areaNodeList: [] }],
        },
      },
      "store array",
    ],
  ])("fails loudly when list structure changes", (payload, message) => {
    expect(() => parseStoreListPayload(payload)).toThrow(message);
  });

  it("reports malformed JSON with its source name", () => {
    expect(() => parseJsonText("<html>error</html>", "list endpoint")).toThrow(
      "Expected JSON from list endpoint"
    );
  });

  it("correlates bilingual lists and detail responses by store ID", async () => {
    const storesEn = parseStoreListPayload(
      await loadJsonFixture("list-en.json")
    );
    const storesZh = parseStoreListPayload(
      await loadJsonFixture("list-zh.json")
    );
    const details = await loadFixture();
    const detailsById = new Map(details.map((detail) => [detail.storeId, detail]));
    const fetchDetail = vi.fn(async (storeId, lang) =>
      lang === "en"
        ? detailsById.get(storeId)?.detailEn
        : detailsById.get(storeId)?.detailZh
    );

    const bundles = await buildStoreDetailBundles(
      storesZh,
      storesEn,
      fetchDetail,
      "1"
    );

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      storeId: "200",
      listEn: { storeName: "Central" },
      listZh: { storeName: "中環" },
      detailEn: { address: "1 Queen's Road Central, Central" },
      detailZh: { address: "中環皇后大道中1號" },
    });
    expect(fetchDetail).toHaveBeenCalledTimes(2);
  });
});

describe("24/7 Fitness injected runner", () => {
  it("uses fixture input without fetching or upserting during a dry run", async () => {
    const details = await loadFixture();
    const writeRows = vi.fn();
    const fetchDetails = vi.fn(() => {
      throw new Error("fixture mode must not fetch");
    });
    const persistRows = vi.fn();
    const log = vi.fn();

    const result = await runImporter(
      { "details-file": "fixture.json", out: "rows.json" },
      {
        loadDetailsFile: vi.fn().mockResolvedValue(details),
        fetchStoreDetailsFromApi: fetchDetails,
        writeRows,
        upsertRows: persistRows,
        now: () => fixedNow,
        cwd: () => "/tmp/gymory-importer-test",
        log,
      }
    );

    expect(fetchDetails).not.toHaveBeenCalled();
    expect(persistRows).not.toHaveBeenCalled();
    expect(writeRows).toHaveBeenCalledOnce();
    expect(writeRows.mock.calls[0][0]).toBe(
      "/tmp/gymory-importer-test/rows.json"
    );
    expect(result).toMatchObject({ upserted: false, rows: { length: 2 } });
    expect(log).toHaveBeenLastCalledWith(
      "Dry run only. Pass --upsert to write to Supabase."
    );
  });

  it("requires credentials before a real upsert", async () => {
    await expect(upsertRows([], {})).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY"
    );
  });
});
