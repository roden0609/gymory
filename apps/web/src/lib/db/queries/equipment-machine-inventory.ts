import type { PublicGymMachine } from "@/lib/equipment-machine-inventory";
import { PUBLIC_INVENTORY_STATUSES } from "@/lib/equipment-catalog-search";
import { createClient } from "../supabase-server";

type Relation<T> = T | T[] | null;

type PublicInventoryRow = {
  quantity: number | null;
  verified_status: PublicGymMachine["verifiedStatus"];
  equipment: Relation<{
    id: string;
    name: string;
    model_number: string | null;
    equipment_categories: Relation<{
      id: string;
      name: string;
      sort_order: number;
    }>;
    equipment_brands: Relation<{
      id: string;
      name_en: string;
      name_zh: string | null;
    }>;
  }>;
};

function first<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function getPublicGymMachineInventory(
  gymId: string
): Promise<PublicGymMachine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_equipment_inventory")
    .select(
      "quantity, verified_status, equipment(id, name, model_number, equipment_categories(id, name, sort_order), equipment_brands(id, name_en, name_zh))"
    )
    .eq("gym_id", gymId)
    .in("verified_status", [...PUBLIC_INVENTORY_STATUSES]);

  if (error || !data) {
    if (error) {
      console.warn(
        `Failed to load public machine inventory for ${gymId}: ${error.message}`
      );
    }
    return [];
  }

  return (data as unknown as PublicInventoryRow[]).flatMap((row) => {
    const equipment = first(row.equipment);
    const category = equipment ? first(equipment.equipment_categories) : null;
    const brand = equipment ? first(equipment.equipment_brands) : null;
    if (!equipment || !category || !brand) return [];

    return [{
      id: equipment.id,
      name: equipment.name,
      modelNumber: equipment.model_number,
      quantity: row.quantity,
      verifiedStatus: row.verified_status,
      category: {
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
      },
      brand: {
        id: brand.id,
        nameEn: brand.name_en,
        nameZh: brand.name_zh,
      },
    }];
  });
}
