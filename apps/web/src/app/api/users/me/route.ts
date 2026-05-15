import { NextResponse } from "next/server";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import { refreshContributorStats } from "@/lib/db/contributor-stats";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";

export async function GET() {
  const user = await getFirebaseSessionUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const stats = await refreshContributorStats(appUser.id, supabase);

  return NextResponse.json({
    user: {
      id: appUser.id,
      firebaseUid: appUser.firebase_uid,
      email: appUser.firebase_email,
      displayName: appUser.display_name,
      handle: appUser.handle,
      avatarUrl: appUser.avatar_url,
      role: appUser.role,
      createdAt: appUser.created_at,
      lastSeenAt: appUser.last_seen_at,
      stats: {
        approvedSubmissionCount: stats.approved_submission_count,
        firstContributorCount: stats.first_contributor_count,
        verifiedSubmissionCount: stats.verified_submission_count,
        accuracyVoteCount: stats.accuracy_vote_count,
      },
    },
  });
}
