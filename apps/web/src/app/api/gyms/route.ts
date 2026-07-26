import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import {
  buildChangedFields,
  buildSubmissionPayloadFromGymSnapshot,
  insertSubmissionRecord,
} from "@/lib/db/gym-submissions";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { isLegacyEquipmentField } from "@gymory/shared";

// GET /api/gyms — list all active gyms (admin use)
export async function GET() {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gyms_normalized")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gyms: data });
}

// POST /api/gyms — create gym (admin only, auth checked server-side)
export async function POST(request: NextRequest) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const legacyEquipmentFields = Object.keys(body ?? {}).filter(
    isLegacyEquipmentField
  );
  if (legacyEquipmentFields.length > 0 || Array.isArray(body?.equipment)) {
    return NextResponse.json(
      {
        error:
          "Use the normalized gym equipment endpoint after creating the gym.",
      },
      { status: 400 }
    );
  }
  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);

  const { data, error } = await supabase
    .from("gyms")
    .insert({
      ...body,
      data_source: "admin",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await insertSubmissionRecord({
      supabase,
      gymId: data.id,
      submittedByUserId: appUser.id,
      reviewedByUserId: appUser.id,
      submissionType: "add_gym",
      status: "approved",
      actorType: "admin",
      actionType: "I",
      payload: buildSubmissionPayloadFromGymSnapshot(data),
      changedFields: buildChangedFields(null, data),
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

  return NextResponse.json({ gym: data }, { status: 201 });
}
