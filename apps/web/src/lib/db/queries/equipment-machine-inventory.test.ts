import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ result: {} as unknown }));
vi.mock("../supabase-server", () => ({ createClient: async () => ({ from: () => {
  const query = { select: () => query, eq: () => query, in: () => Promise.resolve(mocks.result) };
  return query;
} }) }));
import { getPublicGymMachineInventory } from "./equipment-machine-inventory";
describe("public model assignment lookup", () => {
  it("returns one model with all active types, regardless of assignment row order", async () => {
    const type = (code: string) => ({ code, name_en: code, name_zh: null, category: "chest", labels: [], is_active: true, display_order: 0 });
    mocks.result = { error: null, data: [{ quantity: 2, verified_status: "admin_verified", equipment: {
      id: "model", name: "Combo", name_zh: null, model_number: null, labels: [],
      equipment_brands: { id: "brand", name_en: "Brand", name_zh: null },
      equipment_type_assignments: [
        { is_primary: false, equipment_types: [type("reverse_fly_machine")] },
        { is_primary: true, equipment_types: type("chest_fly_machine") },
        { is_primary: false, equipment_types: { ...type("inactive"), is_active: false } },
      ],
    } }] };
    const result = await getPublicGymMachineInventory("gym");
    expect(result).toHaveLength(1);
    expect(result[0].equipmentType.code).toBe("chest_fly_machine");
    expect(result[0].equipmentTypes?.map(t => t.code)).toEqual(["reverse_fly_machine", "chest_fly_machine"]);
    expect(result[0].quantity).toBe(2);
  });
});
