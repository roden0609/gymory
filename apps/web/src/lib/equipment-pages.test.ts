import { describe, expect, it } from "vitest";

import {
  EQUIPMENT_PAGE_DEFINITIONS,
  getEquipmentPageDefinition,
  getEquipmentSearchQuery,
} from "./equipment-pages";

describe("equipment page definitions", () => {
  it.each(EQUIPMENT_PAGE_DEFINITIONS)(
    "resolves $slug and round-trips its search parameters",
    (definition) => {
      expect(getEquipmentPageDefinition(definition.slug)).toBe(definition);
      expect(
        Object.fromEntries(
          new URLSearchParams(getEquipmentSearchQuery(definition)).entries()
        )
      ).toEqual(definition.searchParams);
    }
  );

  it("returns null for an unknown slug", () => {
    expect(getEquipmentPageDefinition("unknown")).toBeNull();
  });

  it("keeps the expected typed filters", () => {
    expect(getEquipmentPageDefinition("hack-squat")?.filters).toEqual([
      { type: "eq", field: "has_hack_squat", value: true },
    ]);
    expect(getEquipmentPageDefinition("power-rack")?.filters).toEqual([
      { type: "gt", field: "rack_count", value: 0 },
    ]);
    expect(getEquipmentPageDefinition("heavy-dumbbells")?.filters).toEqual([
      { type: "gte", field: "dumbbell_max_weight_kg", value: 40 },
    ]);
  });

  it("keeps special OR filters intact", () => {
    expect(getEquipmentPageDefinition("deadlift-platform")?.orFilter).toBe(
      "has_deadlift_platform.eq.true,platform_count.gt.0"
    );
    expect(getEquipmentPageDefinition("wall-ball")?.orFilter).toContain(
      "wall_ball_10kg_count.gt.0"
    );
  });

  it("has unique non-empty slugs", () => {
    const slugs = EQUIPMENT_PAGE_DEFINITIONS.map(({ slug }) => slug);
    expect(slugs.every(Boolean)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
