import type { PublicGymMachine, PublicEquipmentType } from "@/lib/equipment-machine-inventory";
import { PUBLIC_INVENTORY_STATUSES } from "@/lib/equipment-catalog-search";
import { createClient } from "../supabase-server";
import { primaryEquipmentImageUrl, type PublicEquipmentImage } from "@/lib/equipment-image-review";

type Relation<T> = T | T[] | null;
type PublicInventoryRow = {
  quantity: number | null;
  verified_status: PublicGymMachine["verifiedStatus"];
  equipment: Relation<{
    id: string; name: string; name_zh: string | null; labels: string[];
    equipment_images: PublicEquipmentImage[];
    equipment_type_assignments: { is_primary: boolean; equipment_types: Relation<PublicEquipmentType> }[];
    equipment_brands: Relation<{ name_en: string; name_zh: string | null }>;
  }>;
};
function first<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}
export async function getPublicGymMachineInventory(gymId: string): Promise<PublicGymMachine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gym_equipment_inventory")
    .select("quantity, verified_status, equipment(id, name, name_zh, labels, equipment_images(id, image_role, storage_path, is_primary, sort_order), equipment_type_assignments(is_primary, equipment_types(code, name_en, name_zh, category, labels, display_order, is_active)), equipment_brands(name_en, name_zh))")
    .eq("gym_id", gymId).in("verified_status", [...PUBLIC_INVENTORY_STATUSES]);
  if (error || !data) {
    if (error) console.warn(`Failed to load public machine inventory for ${gymId}: ${error.message}`);
    return [];
  }
  return (data as unknown as PublicInventoryRow[]).flatMap((row) => {
    const equipment = first(row.equipment);
    const assignments = equipment?.equipment_type_assignments ?? [];
    const equipmentTypes = assignments.map(a => first(a.equipment_types)).filter((t): t is PublicEquipmentType => Boolean(t?.is_active));
    const primary = first(assignments.find(a => a.is_primary)?.equipment_types ?? null);
    const type = primary?.is_active ? primary : equipmentTypes[0];
    const brand = equipment ? first(equipment.equipment_brands) : null;
    if (!equipment || !type?.is_active || !brand) return [];
    return [{
      id: equipment.id, name: equipment.name, nameZh: equipment.name_zh,
      imageUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? primaryEquipmentImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL,equipment.equipment_images ?? []) : null,
      quantity: row.quantity, labels: equipment.labels, verifiedStatus: row.verified_status,
      equipmentType: type, equipmentTypes, brand: { nameEn: brand.name_en, nameZh: brand.name_zh },
    }];
  });
}
