import {
  PUBLIC_INVENTORY_STATUSES,
  combineBrandGymMatches,
  intersectIds,
} from "@/lib/equipment-catalog-search";
import { createClient } from "../supabase-server";

export type EquipmentCategoryFilterOption = {
  slug: string;
  name: string;
  name_zh: string | null;
};

export type EquipmentMachineSuggestion = {
  label: string;
  machineName: string;
};

export async function getEquipmentMachineSuggestions(): Promise<EquipmentMachineSuggestion[]> {
  const supabase = await createClient();
  const [equipmentResult, aliasResult] = await Promise.all([
    supabase.from("equipment").select("id, name").order("name"),
    supabase.from("equipment_aliases").select("equipment_id, alias").order("alias"),
  ]);
  if (equipmentResult.error || !equipmentResult.data) return [];

  const names = new Map(equipmentResult.data.map(({ id, name }) => [id, name]));
  const suggestions: EquipmentMachineSuggestion[] = equipmentResult.data.map(({ name }) => ({
    label: name,
    machineName: name,
  }));
  if (!aliasResult.error) {
    for (const { equipment_id, alias } of aliasResult.data ?? []) {
      const machineName = names.get(equipment_id);
      if (machineName && alias.toLocaleLowerCase() !== machineName.toLocaleLowerCase()) {
        suggestions.push({ label: alias, machineName });
      }
    }
  }
  return suggestions;
}

export async function getEquipmentCategoryFilterOptions(): Promise<
  EquipmentCategoryFilterOption[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_categories")
    .select("slug, name, name_zh")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error?.code === "42703") {
    const fallback = await supabase
      .from("equipment_categories")
      .select("slug, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    return (fallback.data ?? []).map((category) => ({ ...category, name_zh: null }));
  }
  if (error || !data) return [];
  return data;
}

export async function getCatalogSearchGymIds({
  machine,
  category,
  brandSlugs,
}: {
  machine?: string;
  category?: string;
  brandSlugs?: string[];
}): Promise<Set<string> | null> {
  const machineTerm = machine?.trim();
  const categorySlug = category?.trim();
  const hasBrands = Boolean(brandSlugs?.length);
  if (!machineTerm && !categorySlug && !hasBrands) return null;

  const supabase = await createClient();
  let equipmentIds: Set<string> | null = null;

  if (machineTerm) {
    const [slugResult, nameResult, aliasResult] = await Promise.all([
      supabase.from("equipment").select("id").eq("slug", machineTerm),
      supabase.from("equipment").select("id").ilike("name", `%${machineTerm}%`),
      supabase
        .from("equipment_aliases")
        .select("equipment_id")
        .ilike("alias", `%${machineTerm}%`),
    ]);
    if (slugResult.error || nameResult.error || aliasResult.error) return new Set();
    equipmentIds = new Set([
      ...(slugResult.data ?? []).map(({ id }) => id),
      ...(nameResult.data ?? []).map(({ id }) => id),
      ...(aliasResult.data ?? []).map(({ equipment_id }) => equipment_id),
    ]);
  }

  if (categorySlug) {
    const { data: categories, error: categoryError } = await supabase
      .from("equipment_categories")
      .select("id")
      .eq("slug", categorySlug);
    if (categoryError || !categories?.length) return new Set();
    const { data: machines, error: machineError } = await supabase
      .from("equipment")
      .select("id")
      .in("category_id", categories.map(({ id }) => id));
    if (machineError) return new Set();
    equipmentIds = intersectIds(equipmentIds, (machines ?? []).map(({ id }) => id));
  }

  let brandIds: string[] = [];
  if (hasBrands) {
    const { data: brands, error: brandError } = await supabase
      .from("equipment_brands")
      .select("id")
      .in("slug", brandSlugs!);
    if (brandError || !brands?.length) return new Set();
    brandIds = brands.map(({ id }) => id);
    const { data: machines, error: machineError } = await supabase
      .from("equipment")
      .select("id")
      .in("brand_id", brandIds);
    if (machineError) return new Set();
    equipmentIds = intersectIds(equipmentIds, (machines ?? []).map(({ id }) => id));
  }

  if (!equipmentIds?.size && (machineTerm || categorySlug)) return new Set();
  let modelGymIds: string[] = [];
  if (equipmentIds?.size) {
    const { data: inventory, error: inventoryError } = await supabase
      .from("gym_equipment_inventory")
      .select("gym_id")
      .in("verified_status", [...PUBLIC_INVENTORY_STATUSES])
      .in("equipment_id", [...equipmentIds]);
    if (inventoryError) return new Set();
    modelGymIds = (inventory ?? []).map(({ gym_id }) => gym_id);
  }

  if (!hasBrands) return new Set(modelGymIds);
  const { data: legacyInventory, error: legacyError } = await supabase
    .from("gym_brand_inventory")
    .select("gym_id")
    .in("brand_id", brandIds);
  if (legacyError) return new Set();

  return combineBrandGymMatches({
    modelGymIds,
    legacyBrandGymIds: (legacyInventory ?? []).map(({ gym_id }) => gym_id),
    hasMachineOrCategoryFilter: Boolean(machineTerm || categorySlug),
  });
}
