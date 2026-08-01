import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  buildChangedFields,
  isHongKongPartnerGym,
  mapPartnerGymToGymRow,
  mapPartnerGymsToRows,
  parseArgs,
} from "../../../scripts/import-hyrox-official-hk.mjs";

const fixedNow = new Date("2026-08-01T04:00:00.000Z");

describe("HYROX Official importer", () => {
  it("parses fixture and stale-repair options without executing its CLI", () => {
    expect(parseArgs(["--details-file", "details.json", "--repair-stale"])).toEqual({
      "details-file": "details.json",
      "repair-stale": true,
    });
  });

  it("keeps Hong Kong, rejects Macau, and maps deterministic metadata", async () => {
    const [hongKong, macau] = JSON.parse(await readFile(
      new URL("./fixtures/hyrox-official-hk/api.json", import.meta.url),
      "utf8"
    ));
    expect(isHongKongPartnerGym(hongKong)).toBe(true);
    expect(isHongKongPartnerGym(macau)).toBe(false);
    expect(mapPartnerGymToGymRow(hongKong, fixedNow)).toMatchObject({
      name: "Central Strength & Conditioning",
      slug: "central-strength-and-conditioning-hong-kong",
      district_code: "HK-CW",
      is_hyrox_official: true,
      hyrox_partner_id: "hk-1",
      hyrox_source_synced_at: "2026-08-01T04:00:00.000Z",
      last_reported_at: "2026-08-01T04:00:00.000Z",
    });

    expect(mapPartnerGymsToRows([macau, hongKong], fixedNow)).toEqual([
      mapPartnerGymToGymRow(hongKong, fixedNow),
    ]);
  });

  it("deduplicates an exact location deterministically by partner ID", async () => {
    const [hongKong] = JSON.parse(await readFile(
      new URL("./fixtures/hyrox-official-hk/api.json", import.meta.url),
      "utf8"
    ));
    const original = { ...hongKong, id: "1000" };
    const duplicate = { ...hongKong, id: "999" };

    const rows = mapPartnerGymsToRows([original, duplicate], fixedNow);

    expect(rows).toHaveLength(1);
    expect(rows[0].hyrox_partner_id).toBe("999");
  });

  it("rejects matching slugs that refer to different locations", async () => {
    const [hongKong] = JSON.parse(await readFile(
      new URL("./fixtures/hyrox-official-hk/api.json", import.meta.url),
      "utf8"
    ));
    const conflict = {
      ...hongKong,
      id: "99999",
      address: "Different address",
      lat: "22.3",
      lng: "114.2",
    };

    expect(() => mapPartnerGymsToRows([hongKong, conflict], fixedNow)).toThrow(
      "conflicting records for slug central-strength-and-conditioning-hong-kong"
    );
  });

  it("infers San Po Kong from a Tai Yau Street address", () => {
    const row = mapPartnerGymToGymRow(
      {
        id: "31709",
        store: "G. Yo Fitness",
        address: "1203, 12/F, 1 Tai Yau Street, Midas Plaza",
        city: "Hong Kong",
        country: "China",
        lat: "22.3387447",
        lng: "114.1995296",
      },
      fixedNow
    );

    expect(row.district_code).toBe("HK-WTS");
  });

  it("does not treat a source sync timestamp on its own as a gym change", () => {
    const existing = {
      is_hyrox_official: true,
      hyrox_partner_id: "32082",
      hyrox_source_url: "https://hyrox.com/find-a-hyrox-partner-gym/",
      hyrox_source_synced_at: "2026-05-18T07:20:05.189+00:00",
    };

    expect(
      buildChangedFields(existing, {
        ...existing,
        hyrox_source_synced_at: "2026-08-01T18:54:56.658Z",
      })
    ).toBeNull();
  });

  it("still detects a meaningful HYROX metadata change", () => {
    expect(
      buildChangedFields(
        {
          is_hyrox_official: false,
          hyrox_source_synced_at: "2026-05-18T07:20:05.189+00:00",
        },
        {
          is_hyrox_official: true,
          hyrox_source_synced_at: "2026-08-01T18:54:56.658Z",
        }
      )
    ).toEqual({ is_hyrox_official: true });
  });
});
