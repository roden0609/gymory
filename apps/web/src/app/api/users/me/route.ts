import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import { refreshContributorStats } from "@/lib/db/contributor-stats";
import { getClientIp, hashIpAddress } from "@/lib/db/queries/gym-accuracy";
import { createAdminClient } from "@/lib/db/supabase-admin";
import {
  ensureAppUser,
  insertUserProfileAuditEvent,
  isHandleAvailable,
  normalizeAvatarUrl,
  normalizeUserHandle,
  updateAppUserProfile,
  validateAvatarUrl,
  validateDisplayName,
  validateUserHandle,
} from "@/lib/db/users";

const profileSchema = z.object({
  displayName: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable().optional(),
});

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

export async function PATCH(request: NextRequest) {
  const user = await getFirebaseSessionUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const displayName = parsed.data.displayName.trim();
  const handle = normalizeUserHandle(parsed.data.handle);
  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) {
    return NextResponse.json({ error: displayNameError }, { status: 400 });
  }

  const handleError = validateUserHandle(handle);
  if (handleError) {
    return NextResponse.json({ error: handleError }, { status: 400 });
  }

  const submittedAvatarUrl =
    parsed.data.avatarUrl === undefined
      ? undefined
      : normalizeAvatarUrl(parsed.data.avatarUrl);
  const avatarUrlError =
    submittedAvatarUrl === undefined ? null : validateAvatarUrl(submittedAvatarUrl);
  if (avatarUrlError) {
    return NextResponse.json({ error: avatarUrlError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const avatarUrl =
    submittedAvatarUrl === undefined ? appUser.avatar_url : submittedAvatarUrl;
  const available = await isHandleAvailable({
    handle,
    userId: appUser.id,
    supabase,
  });

  if (!available) {
    return NextResponse.json({ error: "handle_taken" }, { status: 409 });
  }

  const oldValues = {
    display_name: appUser.display_name,
    handle: appUser.handle,
    avatar_url: appUser.avatar_url,
  };
  const newValues = {
    display_name: displayName,
    handle,
    avatar_url: avatarUrl,
  };
  const hasProfileChanges =
    oldValues.display_name !== newValues.display_name ||
    oldValues.handle !== newValues.handle ||
    oldValues.avatar_url !== newValues.avatar_url;

  const updatedUser = await updateAppUserProfile({
    userId: appUser.id,
    displayName,
    handle,
    avatarUrl,
    supabase,
  });
  if (hasProfileChanges) {
    await insertUserProfileAuditEvent({
      userId: appUser.id,
      actorUserId: appUser.id,
      oldValues,
      newValues,
      ipHash: hashIpAddress(getClientIp(request.headers)),
      userAgent: request.headers.get("user-agent"),
      supabase,
    });
  }
  const stats = await refreshContributorStats(updatedUser.id, supabase);

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      firebaseUid: updatedUser.firebase_uid,
      email: updatedUser.firebase_email,
      displayName: updatedUser.display_name,
      handle: updatedUser.handle,
      avatarUrl: updatedUser.avatar_url,
      role: updatedUser.role,
      createdAt: updatedUser.created_at,
      lastSeenAt: updatedUser.last_seen_at,
      stats: {
        approvedSubmissionCount: stats.approved_submission_count,
        firstContributorCount: stats.first_contributor_count,
        verifiedSubmissionCount: stats.verified_submission_count,
        accuracyVoteCount: stats.accuracy_vote_count,
      },
    },
  });
}
