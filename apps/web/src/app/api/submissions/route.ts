import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser } from "@/lib/auth/session";
import {
  buildChangedFields,
  buildGymPatchFromPayload,
  insertSubmissionRecord,
  type SubmissionPayload,
} from "@/lib/db/gym-submissions";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { submissionSchema } from "@gymory/shared";

// POST /api/submissions — authenticated user submits a gym or equipment update
export async function POST(request: NextRequest) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const appUser = await ensureAppUser(user, supabase);
    const payload = parsed.data.payload as SubmissionPayload;
    const patch = buildGymPatchFromPayload(payload);
    const existingGym = parsed.data.gymId
      ? await fetchGymById(supabase, parsed.data.gymId)
      : null;
    const actionType = parsed.data.submissionType === "add_gym" ? "I" : "U";
    const changedFields =
      actionType === "I" ? patch : buildChangedFields(existingGym, patch);

    await insertSubmissionRecord({
      supabase,
      gymId: parsed.data.gymId ?? null,
      submittedByUserId: appUser.id,
      submissionType: parsed.data.submissionType,
      status: "pending",
      actorType: "user_submission",
      actionType,
      payload,
      changedFields,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submit failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}

async function fetchGymById(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string
) {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Gym not found");
  }

  return data as Record<string, unknown>;
}
