import type { GymSummary } from "@gymory/shared";
import {
  TRAINING_PAGE_DEFINITIONS,
  type TrainingPageDefinition,
} from "@/lib/training-pages";
import { createClient } from "../supabase-server";
import { GYM_SEARCH_COLUMNS } from "./search-gyms";

export type TrainingLandingResult = {
  gyms: GymSummary[];
  totalCount: number;
};

export async function getGymsForTrainingPage(
  definition: TrainingPageDefinition
): Promise<TrainingLandingResult> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("gyms_normalized")
    .select(GYM_SEARCH_COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .or(definition.orFilter);

  if (error) return { gyms: [], totalCount: 0 };

  const gyms = ((data ?? []) as unknown as GymSummary[]).filter((gym) =>
    definition.matchesGym(gym)
  );
  await attachAccuracyTallies(gyms);

  return {
    gyms: gyms.sort((a, b) => compareTrainingGyms(a, b, definition)),
    totalCount: gyms.length,
  };
}

export async function getIndexableTrainingPageSlugs() {
  const results = await Promise.all(
    TRAINING_PAGE_DEFINITIONS.map(async (definition) => {
      const result = await getGymsForTrainingPage(definition);
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

function compareTrainingGyms(
  a: GymSummary,
  b: GymSummary,
  definition: TrainingPageDefinition
) {
  const signalDiff = definition.getSignals(b).length - definition.getSignals(a).length;
  if (signalDiff !== 0) return signalDiff;

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
