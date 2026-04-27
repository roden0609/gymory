import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import {
  buildChangedFields,
  buildSubmissionPayloadFromGymSnapshot,
  insertSubmissionRecord,
} from "@/lib/db/gym-submissions";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";

// GET /api/gyms/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ gym: data });
}

// PATCH /api/gyms/[id] — update gym (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const { data: existing, error: existingError } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("gyms")
    .update({
      ...body,
      data_source: "admin",
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await insertSubmissionRecord({
      supabase,
      gymId: params.id,
      submittedByUserId: appUser.id,
      reviewedByUserId: appUser.id,
      submissionType: "edit_gym_info",
      status: "approved",
      actorType: "admin",
      actionType: "U",
      payload: buildSubmissionPayloadFromGymSnapshot(data),
      changedFields: buildChangedFields(existing, data),
      reviewedAt: new Date().toISOString(),
    });
  } catch (submissionError) {
    return NextResponse.json(
      {
        error:
          submissionError instanceof Error
            ? submissionError.message
            : "Submission log failed",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ gym: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const { data: existing, error: existingError } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  const { error } = await supabase.from("gyms").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await insertSubmissionRecord({
      supabase,
      gymId: params.id,
      submittedByUserId: appUser.id,
      reviewedByUserId: appUser.id,
      submissionType: "delete_gym",
      status: "approved",
      actorType: "admin",
      actionType: "D",
      payload: {
        gymId: params.id,
        snapshot: existing,
      },
      changedFields: null,
      reviewedAt: new Date().toISOString(),
    });
  } catch (submissionError) {
    return NextResponse.json(
      {
        error:
          submissionError instanceof Error
            ? submissionError.message
            : "Submission log failed",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
