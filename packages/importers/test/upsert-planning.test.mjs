import { describe, expect, it, vi } from "vitest";

import {
  buildChangeComparison,
  buildChangedFields,
  buildEquipmentChangeComparison,
  buildUpsertRow,
  splitNormalizedEquipment,
  upsertGymsWithSubmissions,
} from "../../../scripts/lib/upsert-gyms-with-submissions.mjs";

describe("import null and overwrite planning", () => {
  const existing = {
    id: "gym-id",
    slug: "existing-gym",
    name: "Existing name",
    estimated_size_sqft: 5000,
    is_active: true,
    tags: ["strength"],
    opening_hours_json: { monday: "24 hours" },
    address: null,
  };

  it("preserves existing values when imports provide null or omit a field", () => {
    expect(
      buildUpsertRow(
        existing,
        {
          slug: "existing-gym",
          name: null,
          estimated_size_sqft: null,
          is_active: null,
          tags: null,
          opening_hours_json: null,
          address: null,
        },
        "import"
      )
    ).toEqual({ slug: "existing-gym", address: null });

    expect(buildUpsertRow(existing, { slug: "existing-gym" }, "import")).toEqual({
      slug: "existing-gym",
    });
  });

  it("fills nulls and replaces different non-null values", () => {
    expect(
      buildUpsertRow(
        existing,
        {
          slug: "existing-gym",
          address: "New address",
          name: "Imported name",
          estimated_size_sqft: 6000,
          is_active: false,
          tags: ["strength", "hyrox"],
          opening_hours_json: { monday: "06:00-23:00" },
        },
        "import"
      )
    ).toMatchObject({
      address: "New address",
      name: "Imported name",
      estimated_size_sqft: 6000,
      is_active: false,
      tags: ["strength", "hyrox"],
      opening_hours_json: { monday: "06:00-23:00" },
    });
  });

  it("does not apply import null-preservation rules to other actor types", () => {
    expect(buildUpsertRow(existing, { name: null }, "admin")).toEqual({
      name: null,
    });
  });
});

describe("import change detection", () => {
  it("ignores reporting fields and exact values", () => {
    expect(
      buildChangedFields(
        { name: "Gym", data_source: "admin" },
        {
          name: "Gym",
          data_source: "import",
          created_at: "new",
          updated_at: "new",
          last_reported_at: "new",
        }
      )
    ).toBeNull();
  });

  it("returns only meaningful changed fields and builds before/after data", () => {
    const existing = { name: "Old", district_code: "HK-CW" };
    const changed = buildChangedFields(existing, {
      name: "New",
      district_code: "HK-CW",
      last_reported_at: "new",
    });

    expect(changed).toEqual({ name: "New" });
    expect(buildChangeComparison(existing, changed)).toEqual({
      name: {
        before: "Old",
        after: "New",
        beforeCaptured: true,
      },
    });
  });

  it("does not PATCH or create a submission when only ignored fields change", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: "gym-id", slug: "existing-gym", data_source: "admin" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await upsertGymsWithSubmissions({
      rows: [
        {
          slug: "existing-gym",
          data_source: "import",
          last_reported_at: "2026-07-31T12:00:00.000Z",
        },
      ],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe("normalized equipment planning", () => {
  it("keeps amenities, removes compatibility fields, and resolves aliases", () => {
    expect(
      splitNormalizedEquipment({
        slug: "gym",
        has_washroom: true,
        has_battle_rope: false,
        has_battle_ropes: true,
        battle_rope_count: 3,
        rack_count: 0,
        sled_count: null,
      })
    ).toEqual({
      gymRow: { slug: "gym", has_washroom: true },
      inventoryItems: [
        { equipmentCode: "battle_rope", isPresent: true, quantity: 3 },
        { equipmentCode: "rack", isPresent: false, quantity: 0 },
      ],
    });
  });

  it("treats omitted, null, undefined, and invalid quantities as no change", () => {
    expect(
      splitNormalizedEquipment({
        slug: "gym",
        rack_count: null,
        bench_count: undefined,
        barbell_count: -1,
        platform_count: 1.5,
      })
    ).toEqual({ gymRow: { slug: "gym" }, inventoryItems: [] });
  });

  it("builds equipment before/after comparisons", () => {
    expect(
      buildEquipmentChangeComparison(
        new Map([
          ["rack", { is_present: true, quantity: 2 }],
        ]),
        [
          { equipmentCode: "rack", isPresent: false, quantity: 0 },
          { equipmentCode: "sled", isPresent: true },
        ]
      )
    ).toEqual({
      "equipment.rack": {
        before: { isPresent: true, quantity: 2 },
        after: { isPresent: false, quantity: 0 },
        beforeCaptured: true,
      },
      "equipment.sled": {
        before: null,
        after: { isPresent: true, quantity: null },
        beforeCaptured: true,
      },
    });
  });
});
