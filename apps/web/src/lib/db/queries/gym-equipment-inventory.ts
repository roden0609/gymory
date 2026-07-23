import type {
  EquipmentType,
  GymEquipmentInventoryItem,
} from "@gymory/shared";
import { createClient } from "../supabase-server";

type InventoryRow = Omit<GymEquipmentInventoryItem, "equipment_type"> & {
  equipment_types: EquipmentType | EquipmentType[] | null;
};

export async function getGymEquipmentInventory(
  gymId: string
): Promise<GymEquipmentInventoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_equipment_inventory")
    .select(
      "id, gym_id, equipment_code, is_present, quantity, created_at, updated_at, equipment_types(code, name_en, name_zh, category, parent_code, supports_quantity, aliases, is_active, display_order, created_at, updated_at)"
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
