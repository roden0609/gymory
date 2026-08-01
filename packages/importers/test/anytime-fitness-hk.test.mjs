import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  mapLocationToGymRow,
  normalizeApiLocation,
  parseArgs,
} from "../../../scripts/import-anytime-fitness-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("Anytime Fitness importer", () => {
  it("can be imported without executing its CLI", () => {
    expect(parseArgs([])).toEqual({});
  });

  it("parses fixture, limit, and write options", () => {
    expect(parseArgs(["--details-file", "details.json", "--limit", "1", "--upsert"])).toEqual({
      "details-file": "details.json",
      limit: "1",
      upsert: true,
    });
  });

  it("normalizes and maps a deterministic API fixture", async () => {
    const [source] = JSON.parse(await readFile(
      new URL("./fixtures/anytime-fitness-hk/api.json", import.meta.url),
      "utf8"
    ));
    const detail = normalizeApiLocation(source);
    const row = mapLocationToGymRow(detail, {}, fixedNow);

    expect(detail).toMatchObject({
      club_number: "9001",
      address: "1 Queen's Road Central, Central",
      address_zh: "中環皇后大道中1號",
      lat: 22.2819,
      lng: 114.1585,
    });
    expect(row).toMatchObject({
      name: "Anytime Fitness Central",
      slug: "anytime-fitness-central-9001",
      district_code: "HK-CW",
      is_active: true,
      last_reported_at: "2026-08-01T04:00:00.000Z",
      rack_count: null,
      has_washroom: null,
      has_bathroom: null,
    });
  });
});
