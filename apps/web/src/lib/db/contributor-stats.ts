import "server-only";

import type { SubmissionPayload } from "./gym-submissions";
import { createAdminClient } from "./supabase-admin";

const CONTRIBUTOR_SUBMISSION_TYPES = [
  "add_gym",
  "add_equipment",
  "edit_equipment",
];

export type ContributorStats = {
  user_id: string;
  approved_submission_count: number;
  first_contributor_count: number;
  verified_submission_count: number;
  accuracy_vote_count: number;
  updated_at: string;
};

export async function recordFirstContributorIfNeeded({
  supabase = createAdminClient(),
  gymId,
  userId,
  submissionId,
  submissionType,
  payload,
}: {
  supabase?: ReturnType<typeof createAdminClient>;
  gymId: string | null;
  userId: string | null;
  submissionId: string;
  submissionType: string;
  payload: SubmissionPayload;
}) {
  if (!gymId || !userId) return;
  if (!isContributorSubmission(submissionType, payload)) return;

  const { error } = await supabase.from("contributor_gym_firsts").upsert(
    {
      gym_id: gymId,
      user_id: userId,
      submission_id: submissionId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "gym_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function refreshContributorStats(
  userId: string,
  supabase = createAdminClient()
): Promise<ContributorStats> {
  const [
    approvedResult,
    firstContributorResult,
    verifiedResult,
    accuracyVoteResult,
  ] = await Promise.all([
    supabase
      .from("gym_update_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", userId)
      .eq("status", "approved"),
    supabase
      .from("contributor_gym_firsts")
      .select("gym_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("gym_update_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", userId)
      .eq("status", "approved")
      .not("reviewed_by_user_id", "is", null)
      .in("submission_type", CONTRIBUTOR_SUBMISSION_TYPES),
    supabase
      .from("gym_accuracy_vote_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const firstError =
    approvedResult.error ??
    firstContributorResult.error ??
    verifiedResult.error ??
    accuracyVoteResult.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    approved_submission_count: approvedResult.count ?? 0,
    first_contributor_count: firstContributorResult.count ?? 0,
    verified_submission_count: verifiedResult.count ?? 0,
    accuracy_vote_count: accuracyVoteResult.count ?? 0,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("contributor_stats")
    .upsert(payload, { onConflict: "user_id" })
    .select(
      "user_id, approved_submission_count, first_contributor_count, verified_submission_count, accuracy_vote_count, updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to refresh contributor stats");
  }

  return data as ContributorStats;
}

function isContributorSubmission(
  submissionType: string,
  payload: SubmissionPayload
) {
  if (!CONTRIBUTOR_SUBMISSION_TYPES.includes(submissionType)) return false;
  if (submissionType === "add_equipment" || submissionType === "edit_equipment") {
    return true;
  }

  return hasPayloadData(payload.equipment) || hasBrandData(payload.brands);
}

function hasPayloadData(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length > 0
  );
}

function hasBrandData(value: unknown) {
  return Array.isArray(value) && value.some((item) => typeof item === "string");
}
