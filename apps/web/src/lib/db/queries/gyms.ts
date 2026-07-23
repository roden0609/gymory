import { createClient } from "../supabase-server";
import type { Gym, GymWithEquipmentInventory } from "@gymory/shared";
import { getGymEquipmentInventory } from "./gym-equipment-inventory";

export async function getGymBySlug(
  slug: string
): Promise<GymWithEquipmentInventory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms_normalized")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  const gym = data as Gym;
  const equipmentInventory = await getGymEquipmentInventory(gym.id);
  return { ...gym, equipment_inventory: equipmentInventory };
}

export async function getGymById(
  id: string
): Promise<GymWithEquipmentInventory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms_normalized")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  const gym = data as Gym;
  const equipmentInventory = await getGymEquipmentInventory(gym.id);
  return { ...gym, equipment_inventory: equipmentInventory };
}
