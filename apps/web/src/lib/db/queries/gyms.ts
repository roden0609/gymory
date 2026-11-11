import { createClient } from "../supabase-server";
import type { Gym } from "@gymory/shared";
import { getGymEquipmentInventory } from "./gym-equipment-inventory";
import { GYM_DETAIL_COLUMNS, type PublicGymDetail } from "./gym-public-columns";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";

// The submission form edits flat compatibility fields, but needs no trust,
// provenance or internal moderation metadata.
export const GYM_SUBMISSION_COLUMNS = [...new Set([
  ...GYM_DETAIL_COLUMNS.split(", ").filter((field) => ![
    "lat", "lng", "postal_code", "is_verified", "is_hyrox_official",
    "equipment_last_verified_at", "updated_at", "data_source",
  ].includes(field)),
  ...GYM_SEARCH_COLUMNS.split(", ").filter((field) => ![
    "lat", "lng", "is_verified", "is_hyrox_official", "data_accuracy_status", "updated_at",
  ].includes(field)),
])].join(", ");

export async function getGymBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms_public")
    .select(GYM_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  const gym = data as unknown as PublicGymDetail;
  const equipmentInventory = await getGymEquipmentInventory(gym.id);
  return { ...gym, equipment_inventory: equipmentInventory };
}

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
