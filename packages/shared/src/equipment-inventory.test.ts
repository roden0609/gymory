import { describe, expect, it } from "vitest";

import {
  buildEquipmentInventoryPatch,
  isLegacyEquipmentField,
  legacyEquipmentFieldToCode,
} from "./equipment-inventory";

describe("isLegacyEquipmentField", () => {
  it.each([
    "has_washroom",
    "has_bathroom",
    "has_changing_room",
    "has_free_water",
    "has_dry_sauna",
    "has_wet_sauna",
    "has_ice_bath",
  ])("excludes the amenity field %s", (field) => {
    expect(isLegacyEquipmentField(field)).toBe(false);
  });

  it.each(["has_sled", "rack_count", "wall_ball_4kg_count"])(
    "accepts the equipment field %s",
    (field) => {
      expect(isLegacyEquipmentField(field)).toBe(true);
    }
  );

  it.each(["name", "equipment_notes", "count_racks"])(
    "rejects the unsupported field %s",
    (field) => {
      expect(isLegacyEquipmentField(field)).toBe(false);
    }
  );
});

describe("legacyEquipmentFieldToCode", () => {
  it.each([
    ["has_sled", "sled"],
    ["rack_count", "rack"],
    ["has_battle_rope", "battle_rope"],
    ["has_battle_ropes", "battle_rope"],
    ["has_farmer_handles", "farmer_handles"],
    ["has_farmers_handles", "farmer_handles"],
    ["lat_pulldown_count", "lat_pulldown_machine"],
    ["chest_press_count", "chest_press_machine"],
    ["leg_press_count", "leg_press_machine"],
  ])("maps %s to %s", (field, expected) => {
    expect(legacyEquipmentFieldToCode(field)).toBe(expected);
  });

  it("returns null for amenities and unsupported fields", () => {
    expect(legacyEquipmentFieldToCode("has_washroom")).toBeNull();
    expect(legacyEquipmentFieldToCode("name")).toBeNull();
  });
});

describe("buildEquipmentInventoryPatch", () => {
  it("builds presence and quantity patches in canonical code order", () => {
    expect(
      buildEquipmentInventoryPatch({
        sled_count: 2,
        has_battle_rope: true,
        has_trap_bar: false,
      })
    ).toEqual([
      { equipmentCode: "battle_rope", isPresent: true },
      { equipmentCode: "sled", isPresent: true, quantity: 2 },
      { equipmentCode: "trap_bar", isPresent: false },
    ]);
  });

  it("ignores amenities, null values, and unsupported fields", () => {
    expect(
      buildEquipmentInventoryPatch({
        has_washroom: true,
        name: true,
        has_sled: null,
        rack_count: undefined,
      })
    ).toEqual([]);
  });

  it.each([-1, 1.5])("ignores invalid quantity %s", (quantity) => {
    expect(buildEquipmentInventoryPatch({ rack_count: quantity })).toEqual([]);
  });

  it("treats a positive quantity as present even when a legacy flag is false", () => {
    expect(
      buildEquipmentInventoryPatch({
        has_chest_press_machine: false,
        chest_press_count: 3,
      })
    ).toEqual([
      {
        equipmentCode: "chest_press_machine",
        isPresent: true,
        quantity: 3,
      },
    ]);
  });

  it("preserves known presence without claiming a zero quantity", () => {
    expect(
      buildEquipmentInventoryPatch({
        has_leg_press_machine: true,
        leg_press_count: 0,
      })
    ).toEqual([
      {
        equipmentCode: "leg_press_machine",
        isPresent: true,
      },
    ]);
  });

  it("uses the greatest valid quantity across aliases", () => {
    expect(
      buildEquipmentInventoryPatch({
        has_battle_rope: true,
        has_battle_ropes: false,
        battle_rope_count: 4,
      })
    ).toEqual([
      {
        equipmentCode: "battle_rope",
        isPresent: true,
        quantity: 4,
      },
    ]);
  });

  it("does not emit a patch when resolved current and previous values match", () => {
    expect(
      buildEquipmentInventoryPatch(
        {
          has_battle_rope: true,
          battle_rope_count: 2,
        },
        {
          has_battle_ropes: false,
          battle_rope_count: 2,
        }
      )
    ).toEqual([]);
  });

  it("emits an update when a resolved quantity changes", () => {
    expect(
      buildEquipmentInventoryPatch(
        { rack_count: 3 },
        { rack_count: 2 }
      )
    ).toEqual([
      { equipmentCode: "rack", isPresent: true, quantity: 3 },
    ]);
  });

  it("emits a removal when a previously known value becomes unknown", () => {
    expect(
      buildEquipmentInventoryPatch(
        { rack_count: null },
        { rack_count: 2 }
      )
    ).toEqual([{ equipmentCode: "rack", remove: true }]);
  });

  it("does not remove a value that was unknown in both states", () => {
    expect(
      buildEquipmentInventoryPatch(
        { rack_count: null },
        { rack_count: undefined }
      )
    ).toEqual([]);
  });
});
