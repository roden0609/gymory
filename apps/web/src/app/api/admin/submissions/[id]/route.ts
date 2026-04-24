import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Gym } from "@gymory/shared";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { toSlug } from "@/lib/utils/slug";

const reviewActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().nullable().optional(),
});

const GYM_FIELDS: Array<keyof Gym> = [
  "name",
  "name_zh",
  "address",
  "address_zh",
  "district_code",
  "country_code",
  "postal_code",
  "website_url",
  "instagram_url",
  "contact_phone",
  "lat",
  "lng",
  "size_category",
  "estimated_size_sqft",
  "opening_hours_json",
  "day_pass_price",
];

const EQUIPMENT_FIELDS: Array<keyof Gym> = [
  "rack_count",
  "bench_count",
  "barbell_count",
  "dumbbell_max_weight_kg",
  "plate_min_weight_kg",
  "plate_max_weight_kg",
  "has_roman_chair",
  "has_trap_bar",
  "has_safety_squat_bar",
  "has_farmer_handles",
  "has_landmine_attachment",
  "has_swiss_bar",
  "has_cambered_bar",
  "has_ez_bar",
  "treadmill_count",
  "assault_bike_count",
  "exercise_bike_count",
  "climber_count",
  "assault_runner_count",
  "ski_erg_count",
  "rower_count",
  "sled_count",
  "has_wall_ball",
  "wall_ball_count",
  "wall_ball_4kg_count",
  "wall_ball_6kg_count",
  "wall_ball_9kg_count",
  "wall_ball_plate_9ft_count",
  "wall_ball_plate_10ft_count",
  "has_sandbag",
  "sandbag_10kg_count",
  "sandbag_20kg_count",
  "sandbag_30kg_count",
  "has_kettlebell",
  "kettlebell_16kg_count",
  "kettlebell_24kg_count",
  "kettlebell_32kg_count",
  "cable_machine_count",
  "has_lat_pulldown_cable",
  "has_seated_row_cable",
  "smith_machine_count",
  "has_bicep_curl_machine",
  "has_tricep_extension_machine",
  "has_chest_press_machine",
  "has_incline_chest_press_machine",
  "has_iso_lateral_chest_press_machine",
  "has_pec_deck_machine",
  "has_chest_fly_machine",
  "has_lat_pulldown_machine",
  "has_seated_row_machine",
  "has_back_extension_machine",
  "has_iso_lateral_row_machine",
  "has_t_bar_row_machine",
  "has_lateral_raise_machine",
  "has_reverse_fly_machine",
  "has_shoulder_press_machine",
  "has_iso_lateral_shoulder_press_machine",
  "has_hip_abductor_machine",
  "has_hip_adductor_machine",
  "has_leg_extension_machine",
  "has_leg_press_machine",
  "has_seated_leg_press_machine",
  "has_lying_leg_curl_machine",
  "has_seated_leg_curl_machine",
  "has_seated_calf_raise_machine",
  "has_squat_machine",
  "has_standing_calf_raise_machine",
  "has_battle_rope",
  "has_foam_roller",
  "has_medicine_ball",
  "has_dip_belt",
  "has_weight_vest",
  "has_lifting_straps",
  "has_plyo_box",
  "has_balance_ball",
  "equipment_notes",
];

type SubmissionPayload = {
  gym?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
};

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
  const parsed = reviewActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review action" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: submission, error: submissionError } = await adminSupabase
    .from("gym_update_submissions")
    .select("id, gym_id, submission_type, status, payload")
    .eq("id", params.id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "Submission has already been reviewed" },
      { status: 409 }
    );
  }

  try {
    let approvedGymId = submission.gym_id;

    if (parsed.data.action === "approve") {
      approvedGymId = await applySubmission(
        adminSupabase,
        submission.gym_id,
        submission.submission_type,
        (submission.payload ?? {}) as SubmissionPayload
      );
    }

    const { error: reviewError } = await adminSupabase
      .from("gym_update_submissions")
      .update({
        gym_id: approvedGymId,
        status: parsed.data.action === "approve" ? "approved" : "rejected",
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: parsed.data.reviewNotes ?? null,
      })
      .eq("id", submission.id);

    if (reviewError) {
      throw new Error(reviewError.message);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}

async function applySubmission(
  supabase: ReturnType<typeof createAdminClient>,
  gymId: string | null,
  submissionType: string,
  payload: SubmissionPayload
) {
  const submittedName = payload.gym?.name;
  const submittedCountryCode = payload.gym?.country_code;
  const gymPatch = pickFields(payload.gym, GYM_FIELDS);
  const equipmentPatch = pickFields(payload.equipment, EQUIPMENT_FIELDS);

  if ("notes" in (payload.gym ?? {})) {
    equipmentPatch.equipment_notes = payload.gym?.notes ?? null;
  }

  const patch = {
    ...gymPatch,
    ...equipmentPatch,
    last_reported_at: new Date().toISOString(),
  };

  if (submissionType === "add_gym") {
    const name = typeof submittedName === "string" ? submittedName : null;
    if (!name) {
      throw new Error("Missing gym name in submission");
    }

    const slug = await generateUniqueSlug(supabase, name);
    const insertPayload = {
      ...patch,
      name,
      slug,
      country_code:
        typeof submittedCountryCode === "string" ? submittedCountryCode : "HK",
      data_source: "user_submission",
      is_active: true,
      is_verified: false,
    };

    const { data, error } = await supabase
      .from("gyms")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create gym");
    }

    return data.id as string;
  }

  if (!gymId) {
    throw new Error("Missing gym_id for update submission");
  }

  const { error } = await supabase.from("gyms").update(patch).eq("id", gymId);
  if (error) {
    throw new Error(error.message);
  }

  return gymId;
}

function pickFields(
  source: Record<string, unknown> | undefined,
  fields: Array<keyof Gym>
) {
  const patch: Record<string, unknown> = {};

  for (const field of fields) {
    if (source && field in source) {
      patch[field] = source[field];
    }
  }

  return patch;
}

async function generateUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  name: string
) {
  const baseSlug = toSlug(name);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("gyms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
