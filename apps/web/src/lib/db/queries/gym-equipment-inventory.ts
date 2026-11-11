import type { PublicEquipmentType, PublicGymTypeInventory } from "@/lib/equipment-machine-inventory";
import { createClient } from "../supabase-server";

type InventoryRow = Omit<PublicGymTypeInventory, "equipment_type"> & {
  equipment_types: PublicEquipmentType | PublicEquipmentType[] | null;
};

export async function getGymEquipmentInventory(
  gymId: string
): Promise<PublicGymTypeInventory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_equipment_type_inventory")
    .select(
      "equipment_code, is_present, quantity, is_directly_reported, equipment_types(code, name_en, name_zh, category, labels, is_active, display_order)"
    )
    .eq("gym_id", gymId);

  if (error || !data) {
    if (error) {
      console.warn(
        `Failed to load normalized equipment inventory for ${gymId}: ${error.message}`
      );
    }
    return [];
  }

  return (data as unknown as InventoryRow[]).map((row) => {
    const equipmentType = Array.isArray(row.equipment_types)
      ? row.equipment_types[0]
      : row.equipment_types;
    const { equipment_types: _equipmentTypes, ...inventory } = row;

    return {
      ...inventory,
      ...(equipmentType ? { equipment_type: equipmentType } : {}),
    };
  });
}
