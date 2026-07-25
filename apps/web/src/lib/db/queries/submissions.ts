import { createAdminClient } from "../supabase-admin";

export const SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export const SUBMISSION_ACTOR_TYPES = [
  "user_submission",
  "admin",
  "owner",
  "import",
] as const;
export const SUBMISSION_TYPES = [
  "add_gym",
  "edit_gym_info",
  "add_equipment",
  "edit_equipment",
  "remove_equipment",
  "upload_photo",
  "delete_gym",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type SubmissionActorType = (typeof SUBMISSION_ACTOR_TYPES)[number];
export type SubmissionTypeFilter = (typeof SUBMISSION_TYPES)[number];

export type SubmissionReviewRow = {
  id: string;
  gym_id: string | null;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  submission_type: string;
  action_type: "I" | "U" | "D";
  actor_type: SubmissionActorType;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
  changed_fields: Record<string, unknown> | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  gyms: {
    id: string;
    name: string;
    name_zh: string | null;
    slug: string;
  } | null;
  submitter: SubmissionUser | null;
  reviewer: SubmissionUser | null;
};

export type SubmissionHistoryFilters = {
  page?: number;
  pageSize?: number;
  status?: "all" | Exclude<SubmissionStatus, "pending">;
  actorType?: "all" | SubmissionActorType;
  submissionType?: "all" | SubmissionTypeFilter;
  gymQuery?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SubmissionPage = {
  submissions: SubmissionReviewRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SubmissionUser = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  firebase_email: string;
  stats: ContributorStatsRow | null;
};

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

const SUBMISSION_SELECT =
  "id, gym_id, submitted_by_user_id, reviewed_by_user_id, submission_type, action_type, actor_type, status, payload, changed_fields, review_notes, reviewed_at, created_at, gyms(id, name, name_zh, slug)";

export async function getPendingSubmissions(): Promise<SubmissionReviewRow[]> {
  const page = await getSubmissionsPage({
    mode: "pending",
    page: 1,
    pageSize: 100,
  });
  return page.submissions;
}

export async function getSubmissionHistory(
  filters: SubmissionHistoryFilters
): Promise<SubmissionPage> {
  return getSubmissionsPage({ mode: "history", ...filters });
}

async function getSubmissionsPage({
  mode,
  page = 1,
  pageSize = 25,
  status = "all",
  actorType = "all",
  submissionType = "all",
  gymQuery = "",
  dateFrom,
  dateTo,
}: SubmissionHistoryFilters & { mode: "pending" | "history" }) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Math.min(
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 25,
    100
  );
  const supabase = createAdminClient();
  let query = supabase
    .from("gym_update_submissions")
    .select(SUBMISSION_SELECT, { count: "exact" });

  if (mode === "pending") {
    query = query.eq("status", "pending");
  } else if (status === "approved" || status === "rejected") {
    query = query.eq("status", status);
  } else {
    query = query.in("status", ["approved", "rejected"]);
  }

  if (actorType !== "all" && isSubmissionActorType(actorType)) {
    query = query.eq("actor_type", actorType);
  }
  if (submissionType !== "all" && isSubmissionType(submissionType)) {
    query = query.eq("submission_type", submissionType);
  }
  if (isIsoDate(dateFrom)) {
    query = query.gte("created_at", `${dateFrom}T00:00:00+08:00`);
  }
  if (isIsoDate(dateTo)) {
    query = query.lt("created_at", `${nextIsoDate(dateTo)}T00:00:00+08:00`);
  }

  const normalizedGymQuery = gymQuery.trim();
  if (normalizedGymQuery) {
    const gymIds = await findGymIds(normalizedGymQuery);
    if (gymIds.length === 0) {
      return emptySubmissionPage(safePage, safePageSize);
    }
    query = query.in("gym_id", gymIds);
  }

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const { data, error, count } = await query
    .order("created_at", { ascending: mode === "pending" })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const submissions = data ?? [];
  const userIds = [
    ...new Set(
      submissions
        .flatMap((submission) => [
          submission.submitted_by_user_id,
          submission.reviewed_by_user_id,
        ])
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const [usersById, statsByUserId] = await Promise.all([
    getUsersById(userIds),
    getContributorStatsByUserId(userIds),
  ]);

  const rows = submissions.map((submission) => ({
    ...submission,
    gyms: Array.isArray(submission.gyms)
      ? (submission.gyms[0] ?? null)
      : submission.gyms,
    submitter: buildSubmissionUser(
      submission.submitted_by_user_id,
      usersById,
      statsByUserId
    ),
    reviewer: buildSubmissionUser(
      submission.reviewed_by_user_id,
      usersById,
      statsByUserId
    ),
  })) as SubmissionReviewRow[];

  const totalCount = count ?? 0;
  return {
    submissions: rows,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
  };
}

async function findGymIds(search: string) {
  const escapedSearch = search.replace(/[%_,()]/g, " ");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("id")
    .or(`name.ilike.%${escapedSearch}%,name_zh.ilike.%${escapedSearch}%`)
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((gym) => gym.id as string);
}

async function getUsersById(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, SubmitterRow>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, firebase_email")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as SubmitterRow[]).map((user) => [user.id, user])
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
    if (isMissingContributorStatsTableError(error.message)) {
      return new Map<string, ContributorStatsRow>();
    }
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ContributorStatsRow[]).map((stats) => [
      stats.user_id,
      stats,
    ])
  );
}

function buildSubmissionUser(
  userId: string | null,
  usersById: Map<string, SubmitterRow>,
  statsByUserId: Map<string, ContributorStatsRow>
) {
  if (!userId) return null;
  const user = usersById.get(userId);
  if (!user) return null;
  return {
    ...user,
    stats: statsByUserId.get(userId) ?? null,
  };
}

function emptySubmissionPage(page: number, pageSize: number): SubmissionPage {
  return {
    submissions: [],
    totalCount: 0,
    page,
    pageSize,
    totalPages: 1,
  };
}

function isSubmissionActorType(value: string): value is SubmissionActorType {
  return SUBMISSION_ACTOR_TYPES.includes(value as SubmissionActorType);
}

function isSubmissionType(value: string): value is SubmissionTypeFilter {
  return SUBMISSION_TYPES.includes(value as SubmissionTypeFilter);
}

function isIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function nextIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isMissingContributorStatsTableError(message: string) {
  return message.includes("contributor_stats") && message.includes("schema cache");
}
