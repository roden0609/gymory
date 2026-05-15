import { createAdminClient } from "../supabase-admin";

export type SubmissionReviewRow = {
  id: string;
  gym_id: string | null;
  submitted_by_user_id: string | null;
  submission_type: string;
  action_type: "I" | "U" | "D";
  actor_type: "user_submission" | "admin" | "owner" | "import";
  status: "pending" | "approved" | "rejected";
  payload: Record<string, unknown>;
  changed_fields: Record<string, unknown> | null;
  review_notes: string | null;
  created_at: string;
  gyms: {
    id: string;
    name: string;
    name_zh: string | null;
    slug: string;
  } | null;
  submitter: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    firebase_email: string;
    stats: {
      approved_submission_count: number;
      first_contributor_count: number;
      verified_submission_count: number;
      accuracy_vote_count: number;
    } | null;
  } | null;
};

export async function getPendingSubmissions(): Promise<SubmissionReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gym_update_submissions")
    .select(
      "id, gym_id, submitted_by_user_id, submission_type, action_type, actor_type, status, payload, changed_fields, review_notes, created_at, gyms(id, name, name_zh, slug)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const submissions = data ?? [];
  const submitterIds = [
    ...new Set(
      submissions
        .map((submission) => submission.submitted_by_user_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];

  const submittersById = await getSubmittersById(submitterIds);
  const statsByUserId = await getContributorStatsByUserId(submitterIds);

  return submissions.map((submission) => {
    const submitterId = submission.submitted_by_user_id;
    const submitter =
      submitterId && submittersById.has(submitterId)
        ? {
            ...submittersById.get(submitterId)!,
            stats: statsByUserId.get(submitterId) ?? null,
          }
        : null;

    return {
      ...submission,
      gyms: Array.isArray(submission.gyms)
        ? (submission.gyms[0] ?? null)
        : submission.gyms,
      submitter,
    };
  }) as SubmissionReviewRow[];
}

async function getSubmittersById(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, SubmitterRow>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, firebase_email")
    .in("id", userIds);

  if (error) {
    if (isMissingContributorStatsTableError(error.message)) {
      return new Map<string, ContributorStatsRow>();
    }
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as SubmitterRow[]).map((submitter) => [
      submitter.id,
      submitter,
    ])
  );
}

async function getContributorStatsByUserId(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ContributorStatsRow>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_stats")
    .select(
      "user_id, approved_submission_count, first_contributor_count, verified_submission_count, accuracy_vote_count"
    )
    .in("user_id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ContributorStatsRow[]).map((stats) => [
      stats.user_id,
      stats,
    ])
  );
}

type SubmitterRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  firebase_email: string;
};

type ContributorStatsRow = {
  user_id: string;
  approved_submission_count: number;
  first_contributor_count: number;
  verified_submission_count: number;
  accuracy_vote_count: number;
};

function isMissingContributorStatsTableError(message: string) {
  return (
    message.includes("contributor_stats") &&
    message.includes("schema cache")
  );
}
