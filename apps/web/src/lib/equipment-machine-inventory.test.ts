import { describe, expect, it } from "vitest";
import {
  groupPublicGymMachines,
  type PublicGymMachine,
} from "./equipment-machine-inventory";

function machine(
  overrides: Partial<PublicGymMachine> & Pick<PublicGymMachine, "id" | "name">
): PublicGymMachine {
  return {
    modelNumber: null,
    quantity: null,
    verifiedStatus: "admin_verified",
    category: { id: "strength", name: "Strength", nameZh: "力量訓練", sortOrder: 10 },
    brand: { id: "brand", nameEn: "Brand", nameZh: null },
    ...overrides,
  };
}

describe("groupPublicGymMachines", () => {
  it("groups and sorts machines by category, brand, and name", () => {
    const groups = groupPublicGymMachines([
      machine({ id: "2", name: "Row", brand: { id: "z", nameEn: "Zulu", nameZh: null } }),
      machine({ id: "3", name: "Bike", category: { id: "cardio", name: "Cardio", nameZh: "帶氧運動", sortOrder: 1 } }),
      machine({ id: "1", name: "Press", brand: { id: "a", nameEn: "Alpha", nameZh: "阿爾法" } }),
    ]);

    expect(groups.map(({ category }) => category.name)).toEqual(["Cardio", "Strength"]);
    expect(groups[1]?.brands.map(({ brand }) => brand.nameEn)).toEqual(["Alpha", "Zulu"]);
    expect(groups[1]?.brands[0]?.machines.map(({ name }) => name)).toEqual(["Press"]);
  });
});
