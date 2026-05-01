import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import {
  getClientIp,
  getCurrentUserVoteByUserId,
  getGymAccuracySnapshot,
  hashIpAddress,
  isAccountOldEnough,
  isLikelyBotRequest,
  maybeFlagGymAsNeedsReview,
  removeGymAccuracyVote,
  shouldThrottleVote,
  upsertGymAccuracyVote,
} from "@/lib/db/queries/gym-accuracy";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";

const voteSchema = z.object({
  vote: z.enum(["like", "dislike"]),
  website: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  const snapshot = await getGymAccuracySnapshot({
    gymId: params.id,
    firebaseUid: user?.uid,
  });

  return NextResponse.json({ snapshot });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent");
  if (isLikelyBotRequest(userAgent, parsed.data.website ?? null)) {
    return NextResponse.json({ error: "Bot-like request rejected" }, { status: 400 });
  }

  const isOldEnough = await isAccountOldEnough(user, 24);
  if (!isOldEnough) {
    return NextResponse.json(
      { error: "Account must be at least 24 hours old before voting" },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);

  const ipHash = hashIpAddress(getClientIp(request.headers));
  const throttled = await shouldThrottleVote({
    userId: appUser.id,
    ipHash,
    supabase,
  });

  if (throttled) {
    return NextResponse.json(
      { error: "Too many vote attempts. Try again later." },
      { status: 429 }
    );
  }

  const existingVote = await getCurrentUserVoteByUserId({
    gymId: params.id,
    userId: appUser.id,
    supabase,
  });

  if (existingVote === parsed.data.vote) {
    await removeGymAccuracyVote({
      gymId: params.id,
      userId: appUser.id,
      previousVote: existingVote,
      ipHash,
      userAgent,
      supabase,
    });
  } else {
    await upsertGymAccuracyVote({
      gymId: params.id,
      userId: appUser.id,
      vote: parsed.data.vote,
      ipHash,
      userAgent,
      supabase,
    });
  }

  const snapshot = await getGymAccuracySnapshot({
    gymId: params.id,
    firebaseUid: user.uid,
    supabase,
  });

  await maybeFlagGymAsNeedsReview({ gymId: params.id, snapshot, supabase });

  const refreshedSnapshot = await getGymAccuracySnapshot({
    gymId: params.id,
    firebaseUid: user.uid,
    supabase,
  });

  return NextResponse.json({ snapshot: refreshedSnapshot }, { status: 201 });
}
