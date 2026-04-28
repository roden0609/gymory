import "server-only";

import { createClient } from "../supabase-server";

export type GymEquipmentBrand = {
  slug: string;
  name_en: string;
  name_zh: string | null;
  country: string | null;
};

export async function getGymEquipmentBrands(gymId: string): Promise<GymEquipmentBrand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_brand_inventory")
    .select("equipment_brands(slug, name_en, name_zh, country)")
    .eq("gym_id", gymId);

  if (error || !data) {
    if (error) {
      console.warn(`Failed to load gym brands for ${gymId}: ${error.message}`);
    }
    return [];
  }

  return data
    .flatMap((row) => row.equipment_brands ?? [])
    .filter(Boolean)
    .map((brand) => ({
      slug: brand.slug,
      name_en: brand.name_en,
      name_zh: brand.name_zh,
      country: brand.country,
    }));
}

export async function getGymEquipmentBrandSlugs(gymId: string): Promise<string[]> {
  const brands = await getGymEquipmentBrands(gymId);
  return brands.map((brand) => brand.slug);
}
