import { describe, expect, it } from "vitest";
import {
  equipmentBrandSchema,
  equipmentMachineSchema,
  gymMachineInventorySchema,
} from "./admin-equipment-validation";

const brandId = "11111111-1111-4111-8111-111111111111";
const gymId = "33333333-3333-4333-8333-333333333333";
const machineId = "44444444-4444-4444-8444-444444444444";

describe("admin equipment CRUD validation", () => {
  it("accepts brand and machine create/update payloads", () => {
    expect(equipmentBrandSchema.parse({
      name_en: "Hammer Strength", name_zh: "", country: "US",
      website_url: "https://example.com", is_active: true,
    }).name_zh).toBeNull();
    expect(equipmentMachineSchema.parse({
      brand_id: brandId, equipment_type_code: "hack_squat",
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
  it("requires a linked type and accepts only predefined model labels", () => {
    const model = {
      brand_id: brandId, equipment_type_code: "chest_press_machine", name: "Chest Press",
      series: "", model_number: "", product_url: "", description: "", status: "active",
      source_type: "manual", aliases: "", labels: ["plate-loaded", "hyrox", "plate-loaded"],
    };
    expect(equipmentMachineSchema.parse(model).labels).toEqual(["plate-loaded", "hyrox"]);
    expect(() => equipmentMachineSchema.parse({ ...model, equipment_type_code: "" })).toThrow();
    expect(() => equipmentMachineSchema.parse({ ...model, labels: ["invented"] })).toThrow();
  });

});
