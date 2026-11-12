import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  fetchHyroxPartnerGyms,
  normalizeFinderPayload,
  buildChangedFields,
  isHongKongPartnerGym,
  mapPartnerGymToGymRow,
  mapPartnerGymsToRows,
  parseArgs,
} from "../../../scripts/gyms/import-hyrox-official-hk.mjs";

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

it("reports finder DNS failures without generating replacement data", async () => {
  const fetcher = async () => { throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } }); };
  await expect(fetchHyroxPartnerGyms(fetcher)).rejects.toThrow("HYROX partner finder request failed (ENOTFOUND) at onefiit-api.platform.onefiit.com");
});

const finderGym = {
  hyroxEntityId: "HGY_example", gymName: "Example Tai Wai",
  address: { country: "HK", city: "Tai Wai", street: "18 Che Kung Miu Road", contactDetails: { phone: "12345678", email: "private@example.com" } },
  geoCoordinates: { lat: 22.37, lon: 114.18 }, images: ["unused"],
};
const finderPayload = { success: true, count: 1, truncated: false, gyms: [finderGym] };

it("reads the new official finder API and returns only consumed fields", async () => {
  const rows = await fetchHyroxPartnerGyms(async (url) => {
    expect(url).toContain("/hyrox365/v1/gyms/map?");
    return { ok: true, text: async () => JSON.stringify(finderPayload) };
  });
  expect(rows[0]).toEqual({ id: "HGY_example", store: "Example Tai Wai", country: "HK", city: "Tai Wai", address: "18 Che Kung Miu Road", phone: "12345678", lat: 22.37, lng: 114.18 });
  expect(mapPartnerGymsToRows(rows, fixedNow)[0]).toMatchObject({ district_code: "HK-ST", hyrox_partner_id: "HGY_example" });
});

it.each([
  { ...finderPayload, truncated: true },
  { ...finderPayload, count: 2 },
  { ...finderPayload, success: false },
  { ...finderPayload, gyms: [{ ...finderGym, hyroxEntityId: null }] },
])("rejects incomplete or invalid finder payloads", (payload) => {
  expect(() => normalizeFinderPayload(payload)).toThrow();
});

it("excludes other country codes and handles Chinese-only gym slugs", () => {
  const rows = normalizeFinderPayload({ success: true, truncated: false, count: 2, gyms: [
    { ...finderGym, gymName: "教練聯盟", address: { country: "HK", city: "", street: "元朗" } },
    { ...finderGym, hyroxEntityId: "HGY_macau", address: { country: "MO", city: "Macau", street: "Hong Kong Road" } },
  ] });
  expect(mapPartnerGymsToRows(rows, fixedNow)).toHaveLength(1);
  expect(mapPartnerGymsToRows(rows, fixedNow)[0]).toMatchObject({ slug: "hyrox-HGY_example", district_code: "HK-YL" });
});
