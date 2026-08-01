import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  extractFacilityRows,
  mapFacilityToGymRow,
  parseArgs,
} from "../../../scripts/import-lcsd-fitness-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("LCSD Fitness importer", () => {
  it("parses limit and geocode options without executing its CLI", () => {
    expect(parseArgs(["--limit", "2", "--skip-geocode"])).toEqual({
      limit: "2",
      "skip-geocode": true,
    });
  });

  it("extracts a facility table and maps a deterministic row", async () => {
    const html = await readFile(
      new URL("./fixtures/lcsd-fitness-hk/list.html", import.meta.url),
      "utf8"
    );
    const [source] = extractFacilityRows(html, "en");
    const row = mapFacilityToGymRow({
      id: source.id,
      name: source.name,
      name_zh: "上環體育館健身室",
      address: source.address,
      address_zh: "香港上環",
      district_en: source.district,
      phone: source.phone,
      detail_url_en: source.detail_url,
      equipment_items: [],
      is_active: true,
    }, {}, fixedNow);

    expect(source).toMatchObject({ id: "101", phone: "28532566" });
    expect(row).toMatchObject({
      name: "LCSD Sheung Wan Sports Centre Fitness Room",
      slug: "lcsd-sheung-wan-sports-centre-fitness-room-101",
      district_code: "HK-CW",
      last_reported_at: "2026-08-01T04:00:00.000Z",
    });
  });
});
