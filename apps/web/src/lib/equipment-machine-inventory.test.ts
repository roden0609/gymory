import { describe, expect, it } from "vitest";
import type { EquipmentType, GymEquipmentInventoryItem } from "@gymory/shared";
import { getHyroxEquipmentTypes, groupGymEquipmentTypes, type PublicGymMachine } from "./equipment-machine-inventory";

const type: EquipmentType = {
  code: "chest_press_machine", name_en: "Chest press", name_zh: "胸推機", category: "chest",
  labels: [], parent_code: null, supports_quantity: true, aliases: [], is_active: true,
  display_order: null, created_at: "", updated_at: "",
};
function inventory(overrides: Partial<GymEquipmentInventoryItem> = {}): GymEquipmentInventoryItem {
  return { id: "1", gym_id: "gym", equipment_code: type.code, equipment_type: type,
    is_present: true, quantity: null, is_directly_reported: true, created_at: "", updated_at: "", ...overrides };
}
function machine(overrides: Partial<PublicGymMachine> = {}): PublicGymMachine {
  return { id: "1", name: "Model", nameZh: null, modelNumber: "CP1", quantity: 2, labels: ["plate-loaded"],
    equipmentType: type, verifiedStatus: "admin_verified", brand: { id: "a", nameEn: "Brand", nameZh: null }, ...overrides };
}
function chest(items: GymEquipmentInventoryItem[], machines: PublicGymMachine[]) {
  return groupGymEquipmentTypes(items, machines).find(({ category }) => category.code === "chest")!.items;
}

describe("type summaries and model details", () => {
  it("shows a type-only report with only its predefined labels", () => {
    const types = chest([inventory({ equipment_type: { ...type, labels: ["hyrox"] } })], []);
    expect(types).toHaveLength(1);
    expect(types[0]).toMatchObject({ type: { labels: ["hyrox"] }, isPresent: true, quantity: null, machines: [] });
  });
  it("creates one type summary for multiple verified models without summing counts or merging labels", () => {
    const items = chest([inventory({ quantity: 5 })], [machine(), machine({ id: "2", quantity: 4, labels: ["selectorized"] })]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
    expect(items[0].type.labels).toEqual([]);
    expect(items[0].machines).toHaveLength(2);
  });
  it("shows models under the linked type regardless of model name", () => {
    expect(chest([], [machine({ name: "Unrecognizable product 123" })])[0]).toMatchObject({ type: { code: type.code }, quantity: null });
  });
  it("hides derived summaries without a verified model", () => {
    expect(chest([inventory({ is_directly_reported: false })], [])).toEqual([]);
    expect(chest([], [machine({ verifiedStatus: "unverified" as PublicGymMachine["verifiedStatus"] })])).toEqual([]);
  });
  it("retains an explicitly reported absence and restores presence when a verified model exists", () => {
    expect(chest([inventory({ is_present: false, quantity: 0 })], [])[0]).toMatchObject({ isPresent: false, quantity: 0 });
    expect(chest([inventory({ is_present: false, quantity: 0 })], [machine()])[0]).toMatchObject({ isPresent: true, quantity: null });
  });
  it("does not publish inactive types", () => {
    const inactive = { ...type, is_active: false };
    expect(chest([inventory({ equipment_type: inactive })], [machine({ equipmentType: inactive })])).toEqual([]);
  });
  it("uses thirteen ordered categories, with HYROX as a label", () => {
    const groups = groupGymEquipmentTypes([], []);
    expect(groups.map(({ category }) => category.code)).toEqual([
      "free_weight", "cardio", "cable", "full_body", "core", "arm", "chest", "back", "shoulder", "leg", "glute", "functional_training", "other",
    ]);
  });
});

describe("HYROX display section", () => {
  it("uses race equipment order without changing primary category order", () => {
    const codes = [
      "assault_runner", "ski_erg", "sled", "rower",
      "kettlebell_16kg", "kettlebell_24kg", "kettlebell_32kg",
      "sandbag_10kg", "sandbag_20kg", "sandbag_30kg",
      "wall_ball_4kg", "wall_ball_6kg", "wall_ball_9kg",
      "wall_ball_plate_9ft", "wall_ball_plate_10ft",
    ];
    const groups = groupGymEquipmentTypes(codes.toReversed().map((code, index) => inventory({
      equipment_code: code,
      equipment_type: { ...type, code, labels: ["hyrox"], display_order: index },
    })), []);
    const originalCodes = groups.flatMap(({ items }) => items.map(({ type }) => type.code));
    expect(getHyroxEquipmentTypes(groups).map(({ type }) => type.code)).toEqual(codes);
    expect(groups.flatMap(({ items }) => items.map(({ type }) => type.code))).toEqual(originalCodes);
  });
  it("includes an available type with its shared HYROX label and all verified models", () => {
    const hyroxType = { ...type, labels: ["hyrox"] };
    const groups = groupGymEquipmentTypes(
      [inventory({ equipment_type: hyroxType, quantity: 5 })],
      [machine({ equipmentType: hyroxType }), machine({ id: "2", equipmentType: hyroxType })]
    );
    const items = getHyroxEquipmentTypes(groups);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
    expect(items[0].machines).toHaveLength(2);
    expect(groups.find(({ category }) => category.code === "chest")!.items[0]).toBe(items[0]);
  });
  it("supports type-only HYROX inventory and excludes known absences", () => {
    const hyroxType = { ...type, labels: ["hyrox"] };
    expect(getHyroxEquipmentTypes(groupGymEquipmentTypes([inventory({ equipment_type: hyroxType })], []))[0].machines).toEqual([]);
    expect(getHyroxEquipmentTypes(groupGymEquipmentTypes([inventory({ equipment_type: hyroxType, is_present: false, quantity: 0 })], []))).toEqual([]);
  });
  it("includes only labelled models when the type itself is not HYROX", () => {
    const groups = groupGymEquipmentTypes([inventory({ quantity: 8 })], [
      machine({ id: "hyrox", labels: ["hyrox", "selectorized"] }),
      machine({ id: "regular" }),
    ]);
    const [item] = getHyroxEquipmentTypes(groups);
    expect(item.quantity).toBeNull();
    expect(item.machines.map(({ id }) => id)).toEqual(["hyrox"]);
    const original = groups.find(({ category }) => category.code === "chest")!.items[0];
    expect(original.quantity).toBe(8);
    expect(original.machines).toHaveLength(2);
  });
  it("excludes unlabelled types and unverified or inactive models", () => {
    expect(getHyroxEquipmentTypes(groupGymEquipmentTypes([], [machine()]))).toEqual([]);
    expect(getHyroxEquipmentTypes(groupGymEquipmentTypes([], [
      machine({ labels: ["hyrox"], verifiedStatus: "unverified" as PublicGymMachine["verifiedStatus"] }),
      machine({ labels: ["hyrox"], equipmentType: { ...type, is_active: false } }),
    ]))).toEqual([]);
  });
});
