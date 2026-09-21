import { describe, expect, it } from "vitest";
import {
  equipmentBrandSchema,
  equipmentCategorySchema,
  equipmentMachineSchema,
  gymMachineInventorySchema,
} from "./admin-equipment-validation";

const brandId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const gymId = "33333333-3333-4333-8333-333333333333";
const machineId = "44444444-4444-4444-8444-444444444444";

describe("admin equipment CRUD validation", () => {
  it("accepts brand, category, and machine create/update payloads", () => {
    expect(equipmentBrandSchema.parse({
      name_en: "Hammer Strength", name_zh: "", country: "US",
      website_url: "https://example.com", is_active: true,
    }).name_zh).toBeNull();
    expect(equipmentCategorySchema.parse({
      id: categoryId, name: "Plate Loaded", name_zh: "槓片式器械", parent_id: "", sort_order: "10",
      is_active: true,
    }).sort_order).toBe(10);
    expect(equipmentMachineSchema.parse({
      brand_id: brandId, category_id: categoryId, equipment_type_code: "hack_squat",
      name: "Hack Squat", series: "", model_number: "PL-HSQ", product_url: "",
      description: "", status: "active", source_type: "manual", aliases: "hack squat",
    }).series).toBeNull();
  });

  it("rejects invalid catalog and inventory payloads", () => {
    expect(() => equipmentBrandSchema.parse({ name_en: "", is_active: true })).toThrow();
    expect(() => equipmentMachineSchema.parse({})).toThrow();
    expect(() => gymMachineInventorySchema.parse({
      gym_id: gymId, equipment_id: machineId, quantity: "0", condition: "good", notes: "",
    })).toThrow();
  });

  it("accepts an optional quantity and trims inventory notes", () => {
    expect(gymMachineInventorySchema.parse({
      gym_id: gymId, equipment_id: machineId, quantity: "", condition: "unknown",
      notes: "  verified on site  ",
    })).toMatchObject({ quantity: null, notes: "verified on site" });
  });
});
