import { describe, expect, it } from "vitest";
import {
  PUBLIC_INVENTORY_STATUSES,
  combineBrandGymMatches,
  intersectIds,
} from "./equipment-catalog-search";

describe("equipment catalog search rules", () => {
  it("publishes only admin- and owner-verified inventory", () => {
    expect(PUBLIC_INVENTORY_STATUSES).toEqual([
      "admin_verified",
      "owner_verified",
    ]);
    expect(PUBLIC_INVENTORY_STATUSES).not.toContain("unverified");
    expect(PUBLIC_INVENTORY_STATUSES).not.toContain("community_verified");
  });

  it("intersects machine, alias/category, brand, and location candidate sets", () => {
    const machineOrAlias = new Set(["gym-a", "gym-b"]);
    const category = intersectIds(machineOrAlias, ["gym-b", "gym-c"]);
    const brand = intersectIds(category, ["gym-b", "gym-d"]);
    const district = intersectIds(brand, ["gym-b", "gym-e"]);
    expect([...district]).toEqual(["gym-b"]);
  });

  it("unions legacy and model signals for brand-only search", () => {
    expect([
      ...combineBrandGymMatches({
        modelGymIds: ["model-gym"],
        legacyBrandGymIds: ["legacy-gym"],
        hasMachineOrCategoryFilter: false,
      }),
    ].sort()).toEqual(["legacy-gym", "model-gym"]);
  });

  it("does not use a legacy brand signal in a combined model search", () => {
    expect([
      ...combineBrandGymMatches({
        modelGymIds: ["matching-model-gym"],
        legacyBrandGymIds: ["legacy-only-gym"],
        hasMachineOrCategoryFilter: true,
      }),
    ]).toEqual(["matching-model-gym"]);
  });
});
