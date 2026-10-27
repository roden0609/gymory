import { EQUIPMENT_CATEGORIES, type EquipmentType, type GymEquipmentInventoryItem } from "@gymory/shared";

export type PublicEquipmentType = Pick<EquipmentType,
  "code" | "name_en" | "name_zh" | "category" | "labels" | "display_order" | "is_active"
>;

export type PublicGymMachine = {
  id: string;
  name: string;
  nameZh: string | null;
  modelNumber: string | null;
  quantity: number | null;
  labels: string[];
  verifiedStatus: "admin_verified" | "owner_verified";
  equipmentType: PublicEquipmentType;
  equipmentTypes?: PublicEquipmentType[];
  brand: { id: string; nameEn: string; nameZh: string | null };
};

export type GymEquipmentTypeSummary = {
  type: PublicEquipmentType;
  isPresent: boolean;
  quantity: number | null;
  machines: PublicGymMachine[];
};

export function groupGymEquipmentTypes(
  inventory: GymEquipmentInventoryItem[],
  machines: PublicGymMachine[]
) {
  const summaries = new Map<string, GymEquipmentTypeSummary>();
  for (const item of inventory) {
    const type = item.equipment_type;
    if (!type?.is_active) continue;
    // Derived rows are publishable only when a public model is available.
    if (!item.is_directly_reported) continue;
    const present = item.is_present ?? ((item.quantity ?? 0) > 0);
    summaries.set(type.code, { type, isPresent: present, quantity: item.quantity, machines: [] });
  }
  for (const machine of machines) {
    if (!["admin_verified", "owner_verified"].includes(machine.verifiedStatus)) continue;
    const types = new Map((machine.equipmentTypes ?? [machine.equipmentType]).filter(t => t.is_active).map(t => [t.code, t]));
    for (const type of types.values()) {
      let summary = summaries.get(type.code);
      if (!summary) {
        summary = { type, isPresent: true, quantity: null, machines: [] };
        summaries.set(type.code, summary);
      }
      // A confirmed model supplies presence but never adds to a type's count.
      if (!summary.isPresent) summary.quantity = null;
      summary.isPresent = true;
      if (!summary.machines.some(existing => existing.id === machine.id)) summary.machines.push(machine);
    }
  }
  return EQUIPMENT_CATEGORIES.map((category) => ({
    category,
    items: [...summaries.values()]
      .filter(({ type }) => type.category === category.code)
      .sort((a, b) => (a.type.display_order ?? 0) - (b.type.display_order ?? 0) ||
        a.type.name_en.localeCompare(b.type.name_en))
      .map((item) => ({ ...item, machines: item.machines.sort((a, b) =>
        a.brand.nameEn.localeCompare(b.brand.nameEn) || a.name.localeCompare(b.name)) })),
  }));
}

const HYROX_DISPLAY_ORDER = [
  "assault_runner", "ski_erg", "sled", "rower",
  "kettlebell_16kg", "kettlebell_24kg", "kettlebell_32kg",
  "sandbag_10kg", "sandbag_20kg", "sandbag_30kg",
  "wall_ball_4kg", "wall_ball_6kg", "wall_ball_9kg",
  "wall_ball_plate_9ft", "wall_ball_plate_10ft",
];

function hyroxDisplayOrder(code: string) {
  const index = HYROX_DISPLAY_ORDER.indexOf(code);
  return index === -1 ? HYROX_DISPLAY_ORDER.length : index;
}

// HYROX is a derived display section, not another primary category/inventory.
export function getHyroxEquipmentTypes(
  groups: ReturnType<typeof groupGymEquipmentTypes>
): GymEquipmentTypeSummary[] {
  return groups.flatMap(({ items }) => items.flatMap((item) => {
    if (!item.isPresent) return [];
    if (item.type.labels.includes("hyrox")) return [item];

    const machines = item.machines.filter((machine) => machine.labels.includes("hyrox"));
    if (machines.length === 0) return [];
    // A type's broad count may include non-HYROX models; keep counts in details.
    return [{ ...item, quantity: null, machines }];
  })).sort((a, b) => hyroxDisplayOrder(a.type.code) - hyroxDisplayOrder(b.type.code));
}
