import { createAdminClient } from "../supabase-admin";

export type SubmissionReviewRow = {
  id: string;
  gym_id: string | null;
  submission_type: string;
  status: "pending" | "approved" | "rejected";
  payload: Record<string, unknown>;
  review_notes: string | null;
  created_at: string;
  gyms: {
    id: string;
    name: string;
    name_zh: string | null;
    slug: string;
  } | null;
};

export async function getPendingSubmissions(): Promise<SubmissionReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gym_update_submissions")
    .select(
      "id, gym_id, submission_type, status, payload, review_notes, created_at, gyms(id, name, name_zh, slug)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((submission) => ({
    ...submission,
    gyms: Array.isArray(submission.gyms)
      ? (submission.gyms[0] ?? null)
      : submission.gyms,
  })) as SubmissionReviewRow[];
}
