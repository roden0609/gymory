import "server-only";

import { createAdminClient } from "../supabase-admin";

export type PublicContributor = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    approved_submission_count: number;
    first_contributor_count: number;
    verified_submission_count: number;
    accuracy_vote_count: number;
  };
};

export async function getTopContributors(
  limit = 50
): Promise<PublicContributor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_stats")
    .select(
      "approved_submission_count, first_contributor_count, verified_submission_count, accuracy_vote_count, users!inner(id, handle, display_name, avatar_url, created_at)"
    )
    .gt("approved_submission_count", 0)
    .order("approved_submission_count", { ascending: false })
    .order("first_contributor_count", { ascending: false })
    .order("verified_submission_count", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingContributorTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeContributor(row))
    .filter((contributor): contributor is PublicContributor => Boolean(contributor));
}

export async function getContributorByHandle(handle: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, handle, display_name, avatar_url, created_at, contributor_stats(approved_submission_count, first_contributor_count, verified_submission_count, accuracy_vote_count)"
    )
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    if (isMissingContributorTableError(error.message)) return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  const stats = Array.isArray(data.contributor_stats)
    ? data.contributor_stats[0]
    : data.contributor_stats;

  if (!data.handle || !stats) return null;

  return {
    id: data.id as string,
    handle: data.handle as string,
    display_name: data.display_name as string | null,
    avatar_url: data.avatar_url as string | null,
    created_at: data.created_at as string,
    stats: {
      approved_submission_count: Number(stats.approved_submission_count ?? 0),
      first_contributor_count: Number(stats.first_contributor_count ?? 0),
      verified_submission_count: Number(stats.verified_submission_count ?? 0),
      accuracy_vote_count: Number(stats.accuracy_vote_count ?? 0),
    },
  };
}

function isMissingContributorTableError(message: string) {
  return (
    message.includes("contributor_stats") &&
    message.includes("schema cache")
  );
}

function normalizeContributor(row: unknown): PublicContributor | null {
  const candidate = row as {
    approved_submission_count?: number;
    first_contributor_count?: number;
    verified_submission_count?: number;
    accuracy_vote_count?: number;
    users?:
      | {
          id?: string;
          handle?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }
      | Array<{
          id?: string;
          handle?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        }>;
  };
  const user = Array.isArray(candidate.users)
    ? candidate.users[0]
    : candidate.users;

  if (!user?.id || !user.handle || !user.created_at) return null;

  return {
    id: user.id,
    handle: user.handle,
    display_name: user.display_name ?? null,
    avatar_url: user.avatar_url ?? null,
    created_at: user.created_at,
    stats: {
      approved_submission_count: Number(candidate.approved_submission_count ?? 0),
      first_contributor_count: Number(candidate.first_contributor_count ?? 0),
      verified_submission_count: Number(candidate.verified_submission_count ?? 0),
      accuracy_vote_count: Number(candidate.accuracy_vote_count ?? 0),
    },
  };
}
