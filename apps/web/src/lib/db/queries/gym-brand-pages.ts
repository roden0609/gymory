import { unstable_cache } from "next/cache";
import { PUBLIC_GYM_OVERVIEW_TAG, PUBLIC_SEARCH_CACHE_SECONDS } from "@/lib/public-search-cache";
import { createPublicClient } from "../supabase-public";
import { withServerTiming } from "@/lib/server-timing";
import { cache } from "react";
import { GYM_CHAINS } from "@gymory/shared";
import { getGymBrand, getGymBrandForGym, summarizeGymBrand, type GymBrandSummaryRow } from "@/lib/gym-brand-pages";
import { createClient } from "../supabase-server";

const BRAND_SUMMARY_COLUMNS = "district_code, rack_count, dumbbell_max_weight_kg, treadmill_count, rower_count, has_bathroom, has_changing_room, has_free_water";

export const getGymBrandOverview = cache(async (slug: string) => withServerTiming("gym_brand_overview_timing", async (timing) => {
  if (!getGymBrand(slug)) return null;
  return timing.measure("brand_overview_ms", () => loadGymBrandOverview(slug));
}));

const loadGymBrandOverview = unstable_cache(async (slug: string) => {
  const brand = getGymBrand(slug);
  if (!brand) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("gym_brand_overview_public")
    .select(BRAND_SUMMARY_COLUMNS)
    .eq("is_active", true)
    .eq("gym_chain_code", brand.code);
  if (error) throw new Error("Failed to load gym brand overview");
  return summarizeGymBrand((data ?? []) as GymBrandSummaryRow[]);
}, ["public-gym-brand-overview-v2", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "unconfigured"], {
  revalidate: PUBLIC_SEARCH_CACHE_SECONDS, tags: [PUBLIC_GYM_OVERVIEW_TAG],
});

// Fetch every page: Supabase limits a single response, which can otherwise omit whole brands.
export const getActiveGymDirectoryEntries = cache(async () => {
  const supabase = await createClient();
  const gyms: { slug: string; district_code: string | null; updated_at: string }[] = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase.from("gyms")
      .select("slug, district_code, updated_at")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);
    if (error) throw new Error(`Failed to load active gyms: ${error.message}`);
    const rows = data ?? [];
    gyms.push(...rows);
    if (rows.length < batchSize) return gyms;
  }
});

export const getGymBrandDirectory = cache(async () => {
  const gyms = await getActiveGymDirectoryEntries();
  const counts = new Map<string, number>();
  for (const gym of gyms) {
    const brand = getGymBrandForGym(gym.slug);
    if (brand) counts.set(brand.slug, (counts.get(brand.slug) ?? 0) + 1);
  }
  return GYM_CHAINS.map((brand) => ({ ...brand, count: counts.get(brand.slug) ?? 0 }));
});
