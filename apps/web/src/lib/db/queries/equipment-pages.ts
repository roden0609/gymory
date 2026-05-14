import type { GymSummary } from "@gymory/shared";
import {
  EQUIPMENT_PAGE_DEFINITIONS,
  type EquipmentPageDefinition,
} from "@/lib/equipment-pages";
import { createClient } from "../supabase-server";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";

export type EquipmentLandingResult = {
  gyms: GymSummary[];
  totalCount: number;
};

export async function getGymsForEquipmentPage(
  definition: EquipmentPageDefinition
): Promise<EquipmentLandingResult> {
  const supabase = await createClient();

  let query = supabase
    .from("gyms")
    .select(GYM_SEARCH_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (definition.brandSlug) {
    const { data: brands, error: brandsError } = await supabase
      .from("equipment_brands")
      .select("id")
      .eq("slug", definition.brandSlug)
      .eq("is_active", true);

    const brandId = brands?.[0]?.id;
    if (brandsError || !brandId) return { gyms: [], totalCount: 0 };

    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("gym_brand_inventory")
      .select("gym_id")
      .eq("brand_id", brandId);

    if (inventoryError || !inventoryRows || inventoryRows.length === 0) {
      return { gyms: [], totalCount: 0 };
    }

    query = query.in("id", [...new Set(inventoryRows.map((row) => row.gym_id))]);
  }

  for (const filter of definition.filters ?? []) {
    if (filter.type === "gt") query = query.gt(filter.field, filter.value);
    if (filter.type === "gte") query = query.gte(filter.field, filter.value);
    if (filter.type === "eq") query = query.eq(filter.field, filter.value);
  }

  if (definition.orFilter) query = query.or(definition.orFilter);

  const { data, error, count } = await query;
  if (error) return { gyms: [], totalCount: 0 };

  const gyms = (data ?? []) as unknown as GymSummary[];
  await attachAccuracyTallies(gyms);

  return {
    gyms: gyms.sort(compareEquipmentLandingGyms),
    totalCount: count ?? gyms.length,
  };
}

export async function getIndexableEquipmentPageSlugs() {
  const results = await Promise.all(
    EQUIPMENT_PAGE_DEFINITIONS.map(async (definition) => {
      const result = await getGymsForEquipmentPage(definition);
      return result.totalCount > 0 ? definition.slug : null;
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

function compareEquipmentLandingGyms(a: GymSummary, b: GymSummary) {
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
