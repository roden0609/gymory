import "server-only";

import type { GymSummary } from "@gymory/shared";
import { createClient } from "../supabase-server";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";

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

export type BrandLandingResult = {
  gyms: GymSummary[];
  totalCount: number;
};

export async function getGymsForBrandPage(
  brandSlug: string
): Promise<BrandLandingResult> {
  const supabase = await createClient();

  const { data: brands, error: brandsError } = await supabase
    .from("equipment_brands")
    .select("id")
    .eq("slug", brandSlug)
    .eq("is_active", true);

  const brandId = brands?.[0]?.id;
  if (brandsError || !brandId) return { gyms: [], totalCount: 0 };

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("gym_brand_inventory")
    .select("gym_id")
    .eq("brand_id", brandId);

  const gymIds = [...new Set((inventoryRows ?? []).map((row) => row.gym_id))];
  if (inventoryError || gymIds.length === 0) {
    return { gyms: [], totalCount: 0 };
  }

  const { data, error } = await supabase
    .from("gyms")
    .select(GYM_SEARCH_COLUMNS)
    .eq("is_active", true)
    .in("id", gymIds);

  if (error) return { gyms: [], totalCount: 0 };

  const gyms = (data ?? []) as unknown as GymSummary[];
  await attachAccuracyTallies(gyms);

  return {
    gyms: gyms.sort(compareBrandLandingGyms),
    totalCount: gyms.length,
  };
}

export async function getIndexableBrandPageSlugs(brandSlugs: string[]) {
  const results = await Promise.all(
    brandSlugs.map(async (brandSlug) => {
      const result = await getGymsForBrandPage(brandSlug);
      return result.totalCount > 0 ? brandSlug : null;
    })
  );

  return results.filter((slug): slug is string => Boolean(slug));
}

async function attachAccuracyTallies(gyms: GymSummary[]) {
  const gymIds = gyms.map((gym) => gym.id);
  if (gymIds.length === 0) return;

  const supabase = await createClient();
  const { data: votes } = await supabase
    .from("gym_accuracy_votes")
    .select("gym_id, vote")
    .in("gym_id", gymIds);

  const tallies = new Map<
    string,
    { likeCount: number; dislikeCount: number; totalVotes: number }
  >();

  for (const vote of votes ?? []) {
    const current = tallies.get(vote.gym_id) ?? {
      likeCount: 0,
      dislikeCount: 0,
      totalVotes: 0,
    };

    if (vote.vote === "like") current.likeCount += 1;
    if (vote.vote === "dislike") current.dislikeCount += 1;
    current.totalVotes += 1;
    tallies.set(vote.gym_id, current);
  }

  for (const gym of gyms) {
    const tally = tallies.get(gym.id);
    gym.accuracy_like_count = tally?.likeCount ?? 0;
    gym.accuracy_dislike_count = tally?.dislikeCount ?? 0;
    gym.accuracy_total_votes = tally?.totalVotes ?? 0;
  }
}

function compareBrandLandingGyms(a: GymSummary, b: GymSummary) {
  const verifiedDiff = Number(b.is_verified) - Number(a.is_verified);
  if (verifiedDiff !== 0) return verifiedDiff;

  const accuracyDiff = accuracyScore(b) - accuracyScore(a);
  if (accuracyDiff !== 0) return accuracyDiff;

  const updatedDiff = timestampMs(b.updated_at) - timestampMs(a.updated_at);
  if (updatedDiff !== 0) return updatedDiff;

  return a.slug.localeCompare(b.slug);
}

function accuracyScore(gym: GymSummary): number {
  const statusScore = gym.data_accuracy_status === "normal" ? 1000 : 0;
  const voteScore =
    (gym.accuracy_like_count ?? 0) -
    (gym.accuracy_dislike_count ?? 0) +
    Math.min(gym.accuracy_total_votes ?? 0, 20) * 0.1;
  return statusScore + voteScore;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
