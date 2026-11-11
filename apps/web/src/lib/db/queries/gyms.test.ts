import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, from } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
  return { query, from: vi.fn(() => query) };
});
vi.mock("../supabase-server", () => ({ createClient: async () => ({ from }) }));
vi.mock("./gym-equipment-inventory", () => ({ getGymEquipmentInventory: vi.fn(async () => []) }));
vi.mock("./equipment-catalog-search", () => ({ getCatalogSearchGymIds: vi.fn() }));
import { getGymById, getGymBySlug, GYM_SUBMISSION_COLUMNS } from "./gyms";
import { GYM_DETAIL_COLUMNS } from "./gym-public-columns";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";
import { getGymEquipmentInventory } from "./gym-equipment-inventory";

beforeEach(() => {
  vi.clearAllMocks();
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data: { id: "gym", slug: "gym" }, error: null });
});

describe("public gym projections", () => {
  it("loads detail and SEO data from the restricted view without flat machine or internal metadata", async () => {
    await getGymBySlug("gym");
    expect(from).toHaveBeenCalledWith("gyms_public");
    expect(query.select).toHaveBeenCalledWith(GYM_DETAIL_COLUMNS);
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    const fields = GYM_DETAIL_COLUMNS.split(", ");
    expect(fields).toEqual(expect.arrayContaining(["country_code", "postal_code", "contact_phone", "opening_hours_json"]));
    for (const field of ["*", "rack_count", "hyrox_source_url", "last_reported_at", "data_accuracy_flagged_at"]) {
      expect(fields).not.toContain(field);
    }
    expect(getGymEquipmentInventory).toHaveBeenCalledWith("gym");
  });

  it("prefills editable form data without fetching unused inventory or provenance", async () => {
    await getGymById("gym");
    expect(query.select).toHaveBeenCalledWith(GYM_SUBMISSION_COLUMNS);
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(getGymEquipmentInventory).not.toHaveBeenCalled();
    const fields = GYM_SUBMISSION_COLUMNS.split(", ");
    expect(fields).toEqual(expect.arrayContaining(["equipment_notes", "has_ice_bath", "rack_count", "country_code"]));
    for (const field of ["*", "data_source", "is_verified", "hyrox_partner_id", "hyrox_source_synced_at", "data_accuracy_status"]) {
      expect(fields).not.toContain(field);
    }
  });

  it("excludes unused provenance from listing queries", () => {
    const fields = GYM_SEARCH_COLUMNS.split(", ");
    for (const field of ["*", "hyrox_partner_id", "hyrox_source_url", "hyrox_source_synced_at", "equipment_last_verified_at", "size_category"]) {
      expect(fields).not.toContain(field);
    }
    expect(fields).toContain("equipment_notes"); // Used for the missing-equipment CTA.
    expect(fields).toContain("plate_min_weight_kg"); // Training collection membership.
  });
});
