import "server-only";

import { createHash } from "crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/auth/firebase-admin";
import { createAdminClient } from "@/lib/db/supabase-admin";

export type GymAccuracyVote = "like" | "dislike";
export type GymAccuracyStatus = "normal" | "needs_review";

export type GymAccuracySnapshot = {
  likeCount: number;
  dislikeCount: number;
  totalVotes: number;
  lastVoteAt: string | null;
  userVote: GymAccuracyVote | null;
  dataAccuracyStatus: GymAccuracyStatus;
  dataAccuracyFlaggedAt: string | null;
};

const NEEDS_REVIEW_MIN_TOTAL_VOTES = 5;
const NEEDS_REVIEW_MIN_DISLIKE_RATIO = 0.6;

export async function getGymAccuracySnapshot({
  gymId,
  firebaseUid,
  supabase = createAdminClient(),
}: {
  gymId: string;
  firebaseUid?: string;
  supabase?: ReturnType<typeof createAdminClient>;
}): Promise<GymAccuracySnapshot> {
  const [
    { count: likeCount },
    { count: dislikeCount },
    { data: latestVoteRows },
    { data: latestEventRows },
    { data: gymRow },
    currentUserVote,
  ] = await Promise.all([
    supabase
      .from("gym_accuracy_votes")
      .select("gym_id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("vote", "like"),
    supabase
      .from("gym_accuracy_votes")
      .select("gym_id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("vote", "dislike"),
    supabase
      .from("gym_accuracy_votes")
      .select("updated_at")
      .eq("gym_id", gymId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("gym_accuracy_vote_events")
      .select("created_at")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("gyms")
      .select("data_accuracy_status, data_accuracy_flagged_at")
      .eq("id", gymId)
      .single(),
    firebaseUid ? getCurrentUserVote({ gymId, firebaseUid, supabase }) : Promise.resolve(null),
  ]);

  const likes = likeCount ?? 0;
  const dislikes = dislikeCount ?? 0;
  const lastVoteUpdatedAt = latestVoteRows?.[0]?.updated_at ?? null;
  const lastEventAt = latestEventRows?.[0]?.created_at ?? null;
  const lastVoteAt =
    lastVoteUpdatedAt && lastEventAt
      ? (lastVoteUpdatedAt > lastEventAt ? lastVoteUpdatedAt : lastEventAt)
      : (lastVoteUpdatedAt ?? lastEventAt);

  return {
    likeCount: likes,
    dislikeCount: dislikes,
    totalVotes: likes + dislikes,
    lastVoteAt,
    userVote: currentUserVote,
    dataAccuracyStatus: (gymRow?.data_accuracy_status as GymAccuracyStatus | undefined) ?? "normal",
    dataAccuracyFlaggedAt: gymRow?.data_accuracy_flagged_at ?? null,
  };
}

export async function upsertGymAccuracyVote({
  gymId,
  userId,
  vote,
  ipHash,
  userAgent,
  supabase = createAdminClient(),
}: {
  gymId: string;
  userId: string;
  vote: GymAccuracyVote;
  ipHash: string | null;
  userAgent: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const { error } = await supabase
    .from("gym_accuracy_votes")
    .upsert({ gym_id: gymId, user_id: userId, vote }, { onConflict: "gym_id,user_id" });

  if (error) throw new Error(error.message);

  const { error: eventError } = await supabase.from("gym_accuracy_vote_events").insert({
    gym_id: gymId,
    user_id: userId,
    vote,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (eventError) throw new Error(eventError.message);
}

export async function removeGymAccuracyVote({
  gymId,
  userId,
  previousVote,
  ipHash,
  userAgent,
  supabase = createAdminClient(),
}: {
  gymId: string;
  userId: string;
  previousVote: GymAccuracyVote;
  ipHash: string | null;
  userAgent: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const { error } = await supabase
    .from("gym_accuracy_votes")
    .delete()
    .eq("gym_id", gymId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const { error: eventError } = await supabase.from("gym_accuracy_vote_events").insert({
    gym_id: gymId,
    user_id: userId,
    vote: previousVote,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  if (eventError) throw new Error(eventError.message);
}

export async function shouldThrottleVote({
  userId,
  ipHash,
  supabase = createAdminClient(),
}: {
  userId: string;
  ipHash: string | null;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const userCountPromise = supabase
    .from("gym_accuracy_vote_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  const ipCountPromise = ipHash
    ? supabase
        .from("gym_accuracy_vote_events")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since)
    : Promise.resolve({ count: 0 });

  const [{ count: userCount }, { count: ipCount }] = await Promise.all([
    userCountPromise,
    ipCountPromise,
  ]);

  return (userCount ?? 0) >= 10 || (ipCount ?? 0) >= 20;
}

export async function maybeFlagGymAsNeedsReview({
  gymId,
  snapshot,
  supabase = createAdminClient(),
}: {
  gymId: string;
  snapshot: GymAccuracySnapshot;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  if (snapshot.dataAccuracyStatus === "needs_review") return;

  if (snapshot.totalVotes < NEEDS_REVIEW_MIN_TOTAL_VOTES) return;

  const dislikeRatio = snapshot.totalVotes > 0 ? snapshot.dislikeCount / snapshot.totalVotes : 0;
  if (dislikeRatio < NEEDS_REVIEW_MIN_DISLIKE_RATIO) return;

  const { error } = await supabase
    .from("gyms")
    .update({
      data_accuracy_status: "needs_review",
      data_accuracy_flagged_at: new Date().toISOString(),
    })
    .eq("id", gymId)
    .eq("data_accuracy_status", "normal");

  if (error) throw new Error(error.message);
}

async function getCurrentUserVote({
  gymId,
  firebaseUid,
  supabase,
}: {
  gymId: string;
  firebaseUid: string;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<GymAccuracyVote | null> {
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();

  if (!userRow?.id) return null;

  const { data: voteRow } = await supabase
    .from("gym_accuracy_votes")
    .select("vote")
    .eq("gym_id", gymId)
    .eq("user_id", userRow.id)
    .maybeSingle();

  return (voteRow?.vote as GymAccuracyVote | undefined) ?? null;
}

export async function getCurrentUserVoteByUserId({
  gymId,
  userId,
  supabase = createAdminClient(),
}: {
  gymId: string;
  userId: string;
  supabase?: ReturnType<typeof createAdminClient>;
}) {
  const { data: voteRow } = await supabase
    .from("gym_accuracy_votes")
    .select("vote")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .maybeSingle();

  return (voteRow?.vote as GymAccuracyVote | undefined) ?? null;
}

export function hashIpAddress(ip: string | null) {
  if (!ip) return null;

  const normalized = ip.trim();
  if (!normalized) return null;

  const salt = process.env.GYMORY_IP_HASH_SALT ?? "gymory-ip-salt";
  return createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

export function getClientIp(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (!forwarded) return null;

  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || null;
}

export async function isAccountOldEnough(user: DecodedIdToken, minAgeHours: number) {
  const userRecord = await getAdminAuth().getUser(user.uid);
  const createdAt = new Date(userRecord.metadata.creationTime).getTime();
  const minAgeMs = minAgeHours * 60 * 60 * 1000;
  return Date.now() - createdAt >= minAgeMs;
}

export function isLikelyBotRequest(userAgent: string | null, honeypot: string | null) {
  if (honeypot && honeypot.trim().length > 0) return true;

  if (!userAgent) return true;

  const lower = userAgent.toLowerCase();
  return ["bot", "spider", "crawler", "headless", "phantom", "selenium"].some((token) =>
    lower.includes(token)
  );
}
