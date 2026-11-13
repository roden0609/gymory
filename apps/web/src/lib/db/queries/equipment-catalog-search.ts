import { unstable_cache } from "next/cache";
import { PUBLIC_CATALOG_TAG, PUBLIC_SEARCH_CACHE_SECONDS } from "@/lib/public-search-cache";
import { createPublicClient } from "../supabase-public";
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
  try { return await loadMachineSuggestions(); } catch { return []; }
}

const loadMachineSuggestions = unstable_cache(async (): Promise<EquipmentMachineSuggestion[]> => {
  const supabase = createPublicClient();
  const [equipmentResult, aliasResult] = await Promise.all([
    supabase.from("equipment").select("id, name").order("name"),
    supabase.from("equipment_aliases").select("equipment_id, alias").order("alias"),
  ]);
  // Throw inside the cache so a transient failure never becomes a cached empty list.
  if (equipmentResult.error || aliasResult.error || !equipmentResult.data) {
    throw new Error("Failed to load public machine suggestions");
  }

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
}, ["public-machine-suggestions-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "unconfigured"], {
  revalidate: PUBLIC_SEARCH_CACHE_SECONDS, tags: [PUBLIC_CATALOG_TAG],
});

export async function getEquipmentCategoryFilterOptions(): Promise<
  EquipmentCategoryFilterOption[]
> {
  try { return await loadCategoryOptions(); } catch { return []; }
}

const loadCategoryOptions = unstable_cache(async (): Promise<EquipmentCategoryFilterOption[]> => {
  const supabase = createPublicClient();
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
    if (fallback.error || !fallback.data) throw new Error("Failed to load public categories");
    return fallback.data.map(({ slug, name }) => ({ slug, name, name_zh: null }));
  }
  if (error || !data) throw new Error("Failed to load public categories");
  return data.map(({ slug, name, name_zh }) => ({ slug, name, name_zh }));
}, ["public-category-options-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "unconfigured"], {
  revalidate: PUBLIC_SEARCH_CACHE_SECONDS, tags: [PUBLIC_CATALOG_TAG],
});

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
    const { data: types, error: typeError } = await supabase
      .from("equipment_types").select("code").eq("category", categorySlug.replaceAll("-", "_")).eq("is_active", true);
    if (typeError || !types?.length) return new Set();
    const { data: assignments, error: assignmentError } = await supabase
      .from("equipment_type_assignments").select("equipment_id")
      .in("equipment_type_code", types.map(({ code }) => code));
    if (assignmentError) return new Set();
    equipmentIds = intersectIds(equipmentIds, (assignments ?? []).map(({ equipment_id }) => equipment_id));
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
