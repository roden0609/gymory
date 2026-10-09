import { EQUIPMENT_CATEGORIES, type EquipmentType, type GymEquipmentInventoryItem } from "@gymory/shared";

export type PublicEquipmentType = Pick<EquipmentType,
  "code" | "name_en" | "name_zh" | "category" | "labels" | "display_order" | "is_active"
>;

export type PublicGymMachine = {
  id: string;
  name: string;
  modelNumber: string | null;
  quantity: number | null;
  labels: string[];
  verifiedStatus: "admin_verified" | "owner_verified";
  equipmentType: PublicEquipmentType;
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
    if (!machine.equipmentType.is_active ||
      !["admin_verified", "owner_verified"].includes(machine.verifiedStatus)) continue;
    const type = machine.equipmentType;
    let summary = summaries.get(type.code);
    if (!summary) {
      summary = { type, isPresent: true, quantity: null, machines: [] };
      summaries.set(type.code, summary);
    }
    // A confirmed model supplies presence but never adds to a type's count.
    if (!summary.isPresent) summary.quantity = null;
    summary.isPresent = true;
    summary.machines.push(machine);
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
  }));
}
