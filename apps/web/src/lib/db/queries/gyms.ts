import { cache } from "react";
import { createClient } from "../supabase-server";
import { SUBMIT_EQUIPMENT_PRESENCE_CODES, type Gym, type SubmitEquipmentPresenceCode } from "@gymory/shared";
import { getGymEquipmentInventory } from "./gym-equipment-inventory";
import { GYM_DETAIL_COLUMNS, type PublicGymDetail } from "./gym-public-columns";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";

// The submission form edits flat compatibility fields, but needs no trust,
// provenance or internal moderation metadata.
export const GYM_SUBMISSION_COLUMNS = [...new Set([
  "size_category",
  "estimated_size_sqft",
  ...GYM_DETAIL_COLUMNS.split(", ").filter((field) => ![
    "lat", "lng", "postal_code", "is_verified", "is_hyrox_official",
    "equipment_last_verified_at", "updated_at",
    "threads_url", "facebook_url",
  ].includes(field)),
  ...GYM_SEARCH_COLUMNS.split(", ").filter((field) => ![
    "lat", "lng", "is_verified", "is_hyrox_official", "data_accuracy_status", "updated_at",
  ].includes(field)),
])].join(", ");

// Share the same public read between metadata and the page within one render only.
export const getGymBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms_public")
    .select(GYM_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") throw new Error("Failed to load gym details");
  if (error || !data) return null;
  const gym = data as unknown as PublicGymDetail;
  const equipmentInventory = await getGymEquipmentInventory(gym.id);
  return { ...gym, equipment_inventory: equipmentInventory };
});

export async function getGymById(id: string): Promise<(Partial<Gym> & Pick<Gym, "id" | "slug">) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms_public")
    .select(GYM_SUBMISSION_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as unknown as Partial<Gym> & Pick<Gym, "id" | "slug">;
}

export async function getSubmitEquipmentPresence(gymId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_equipment_type_inventory")
    .select("equipment_code, is_present")
    .eq("gym_id", gymId)
    .in("equipment_code", [...SUBMIT_EQUIPMENT_PRESENCE_CODES]);

  if (error) throw new Error("Failed to load equipment presence");

  const presence: Partial<Record<SubmitEquipmentPresenceCode, boolean>> = {};
  for (const code of SUBMIT_EQUIPMENT_PRESENCE_CODES) {
    const value = data.find((row) => row.equipment_code === code)?.is_present;
    if (typeof value === "boolean") presence[code] = value;
  }
  return presence;
}
