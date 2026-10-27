import { describe, expect, it } from "vitest";
import { equipmentFilterConditions, parseEquipmentFilters } from "./admin-equipment-filters";

const brand = "123e4567-e89b-42d3-a456-426614174000";

describe("admin equipment filters", () => {
  it("combines all three filters with the correct database columns", () => {
    expect(equipmentFilterConditions(parseEquipmentFilters({ brand, equipmentType: "chest_press_machine", status: "active" }))).toEqual([
      ["brand_id", brand], ["equipment_type_code", "chest_press_machine"], ["status", "active"],
    ]);
  });

  it("ignores empty and malformed filters without losing valid selections", () => {
    expect(parseEquipmentFilters({ brand: "invalid", equipmentType: "", status: "discontinued" })).toEqual({ status: "discontinued" });
    expect(parseEquipmentFilters({ brand: "", equipmentType: "bad,type", status: "invented" })).toEqual({});
    expect(parseEquipmentFilters({})).toEqual({});
  });

  it("accepts each supported status", () => {
    for (const status of ["active", "discontinued", "unknown"]) expect(parseEquipmentFilters({ status })).toEqual({ status });
  });
});
