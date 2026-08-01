import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildChangeComparison,
  buildChangedFields,
  buildEquipmentChangeComparison,
  buildUpsertRow,
  splitNormalizedEquipment,
  upsertGymsWithSubmissions,
} from "../../../scripts/lib/upsert-gyms-with-submissions.mjs";

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it("preserves a detailed DB address when an import returns only its shorter subset", () => {
    expect(
      buildUpsertRow(
        {
          ...existing,
          address: "7 & 9, L2, Cheung Ying Alley, 110 Lung Cheung Road, Wong Tai Sin",
          address_zh: "黃大仙龍翔道110號翔盈里L2樓7及9號舖",
        },
        {
          slug: "existing-gym",
          address: "110 Lung Cheung Road",
          address_zh: "龍翔道110號",
        },
        "import"
      )
    ).toEqual({ slug: "existing-gym" });
  });

  it("allows an imported address that is genuinely different", () => {
    expect(
      buildUpsertRow(
        { ...existing, address: "1 Old Road, Central" },
        { slug: "existing-gym", address: "2 New Road, Wan Chai" },
        "import"
      )
    ).toEqual({ slug: "existing-gym", address: "2 New Road, Wan Chai" });
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
          equipment_last_verified_at: "new",
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
          equipment_last_verified_at: "2026-08-01T18:27:36.215Z",
        },
      ],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
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

describe("Supabase upsert orchestration", () => {
  it("inserts a new gym and records an approved add-gym submission", async () => {
    const inserted = {
      id: "new-gym-id",
      slug: "new-gym",
      name: "New Gym",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([inserted], 201))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertGymsWithSubmissions({
      rows: [{ slug: "new-gym", name: "New Gym", data_source: "import" }],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://example.invalid/rest/v1/gyms"
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      slug: "new-gym",
      name: "New Gym",
      data_source: "import",
    });

    const submission = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(submission).toMatchObject({
      gym_id: "new-gym-id",
      submission_type: "add_gym",
      status: "approved",
      action_type: "I",
      actor_type: "import",
      changed_fields: {
        id: "new-gym-id",
        slug: "new-gym",
        name: "New Gym",
      },
    });
  });

  it("PATCHes changed gym data and records only meaningful changed fields", async () => {
    const existing = {
      id: "gym-id",
      slug: "existing-gym",
      name: "Old Name",
      data_source: "admin",
    };
    const updated = { ...existing, name: "New Name", data_source: "import" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([existing]))
      .mockResolvedValueOnce(jsonResponse([updated]))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertGymsWithSubmissions({
      rows: [
        {
          slug: "existing-gym",
          name: "New Name",
          data_source: "import",
          last_reported_at: "2026-08-01T00:00:00.000Z",
        },
      ],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PATCH" });
    const submission = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(submission.changed_fields).toEqual({ name: "New Name" });
    expect(submission.payload.changeComparison).toEqual({
      name: {
        before: "Old Name",
        after: "New Name",
        beforeCaptured: true,
      },
    });
    expect(submission.changed_fields).not.toHaveProperty("data_source");
    expect(submission.changed_fields).not.toHaveProperty("last_reported_at");
  });

  it("skips the equipment RPC when normalized inventory is unchanged", async () => {
    const existing = { id: "gym-id", slug: "existing-gym" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([existing]))
      .mockResolvedValueOnce(
        jsonResponse([
          { equipment_code: "rack", is_present: true, quantity: 2 },
        ])
      );
    vi.stubGlobal("fetch", fetchMock);

    await upsertGymsWithSubmissions({
      rows: [{ slug: "existing-gym", rack_count: 2 }],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/rest/v1/gym_equipment_inventory"
    );
  });

  it("sends changed inventory through the normalized equipment RPC", async () => {
    const existing = { id: "gym-id", slug: "existing-gym" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([existing]))
      .mockResolvedValueOnce(
        jsonResponse([
          { equipment_code: "rack", is_present: true, quantity: 1 },
        ])
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertGymsWithSubmissions({
      rows: [{ slug: "existing-gym", rack_count: 3 }],
      actorType: "import",
      supabaseUrl: "https://example.invalid",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://example.invalid/rest/v1/rpc/apply_gym_equipment_import_patch"
    );
    const rpcBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(rpcBody.p_inventory_items).toEqual([
      { equipmentCode: "rack", isPresent: true, quantity: 3 },
    ]);
    expect(rpcBody.p_source_payload.changeComparison).toEqual({
      "equipment.rack": {
        before: { isPresent: true, quantity: 1 },
        after: { isPresent: true, quantity: 3 },
        beforeCaptured: true,
      },
    });
  });

  it.each([
    ["gym fetch", 500, "Supabase fetch failed"],
    ["gym fetch", 401, "Supabase fetch failed"],
  ])("reports %s HTTP %s failures", async (_label, status, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream error", { status }))
    );

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "gym" }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow(message);
  });

  it("reports network failures without swallowing the original error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable"))
    );

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "gym" }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow("network unavailable");
  });

  it("reports normalized equipment RPC failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([{ id: "gym-id", slug: "existing-gym" }])
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response("rpc error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "existing-gym", rack_count: 2 }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow("Supabase normalized equipment import failed: 500");
  });

  it("reports new-gym insert failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(new Response("insert error", { status: 500 }))
    );

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "new-gym", name: "New Gym" }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow("Supabase insert failed: 500");
  });

  it("reports submission insert failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(
          jsonResponse([{ id: "gym-id", slug: "new-gym" }], 201)
        )
        .mockResolvedValueOnce(
          new Response("submission error", { status: 500 })
        )
    );

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "new-gym" }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow("Supabase submission insert failed: 500");
  });

  it("reports existing inventory fetch failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([{ id: "gym-id", slug: "existing-gym" }])
        )
        .mockResolvedValueOnce(
          new Response("inventory error", { status: 500 })
        )
    );

    await expect(
      upsertGymsWithSubmissions({
        rows: [{ slug: "existing-gym", rack_count: 2 }],
        actorType: "import",
        supabaseUrl: "https://example.invalid",
        apiKey: "test-key",
      })
    ).rejects.toThrow("Supabase inventory fetch failed: 500");
  });
});
