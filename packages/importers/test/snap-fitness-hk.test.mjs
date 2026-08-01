import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  mapLocationToGymRow,
  mergeLocalizedLocations,
  parseArgs,
} from "../../../scripts/import-snap-fitness-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("Snap Fitness importer", () => {
  it("parses fixture and write options without executing its CLI", () => {
    expect(parseArgs(["--details-file", "details.json", "--upsert"])).toEqual({
      "details-file": "details.json",
      upsert: true,
    });
  });

  it("pairs localized API records and maps a deterministic row", async () => {
    const payload = JSON.parse(await readFile(
      new URL("./fixtures/snap-fitness-hk/api.json", import.meta.url),
      "utf8"
    ));
    const [detail] = mergeLocalizedLocations(payload.en, payload.zh);
    const row = mapLocationToGymRow(detail, {}, fixedNow);

    expect(detail).toMatchObject({
      location_num: "3001",
      address: "1 Queen's Road Central, Central",
      address_zh: "中環皇后大道中1號",
    });
    expect(row).toMatchObject({
      name: "Snap Fitness Central HK",
      name_zh: "Snap Fitness 中環",
      slug: "snap-fitness-central-hk-3001",
      district_code: "HK-CW",
      last_reported_at: "2026-08-01T04:00:00.000Z",
      has_washroom: null,
      has_bathroom: null,
    });
  });
});
