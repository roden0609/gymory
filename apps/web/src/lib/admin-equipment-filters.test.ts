import { describe, expect, it } from "vitest";
import { equipmentFilterConditions, equipmentTextFilterConditions, parseEquipmentFilters } from "./admin-equipment-filters";

const brand = "123e4567-e89b-42d3-a456-426614174000";

describe("admin equipment filters", () => {
  it("combines all three filters with the correct database columns", () => {
    expect(equipmentFilterConditions(parseEquipmentFilters({ brand, equipmentType: "chest_press_machine", status: "active" }))).toEqual([
      ["brand_id", brand], ["matching_types.equipment_type_code", "chest_press_machine"], ["status", "active"],
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

describe("equipment text filters", () => {
  it("trims text and rejects empty or oversized searches", () => {
    expect(parseEquipmentFilters({ name: "  跑步機  ", model: "  PL4W " })).toEqual({ name: "跑步機", model: "PL4W" });
    expect(parseEquipmentFilters({ name: "   ", model: "a".repeat(201) })).toEqual({});
  });

  it("searches both name languages and both series/model columns independently", () => {
    const filters = parseEquipmentFilters({ name: "Neck", model: "PL4W", status: "active" });
    expect(equipmentFilterConditions(filters)).toEqual([["status", "active"]]);
    expect(equipmentTextFilterConditions(filters)).toEqual([
      'name.ilike."%Neck%",name_zh.ilike."%Neck%"',
      'series.ilike."%PL4W%",model_number.ilike."%PL4W%"',
    ]);
  });

  it("quotes punctuation and escapes wildcard characters in user input", () => {
    const value = '50%_"test",(x)';
    const pattern = JSON.stringify('%50\\%\\_"test",(x)%');
    expect(equipmentTextFilterConditions({ name: value })).toEqual([`name.ilike.${pattern},name_zh.ilike.${pattern}`]);
    expect(equipmentTextFilterConditions({})).toEqual([]);
  });
});
