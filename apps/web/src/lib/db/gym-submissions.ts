import "server-only";

import type { Gym } from "@gymory/shared";
import { createAdminClient } from "./supabase-admin";

export type SubmissionPayload = {
  gym?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SubmissionActorType = "user_submission" | "admin" | "owner" | "import";
export type SubmissionActionType = "I" | "U" | "D";

export const GYM_FIELDS: Array<keyof Gym> = [
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

export const EQUIPMENT_FIELDS: Array<keyof Gym> = [
  "rack_count",
  "bench_count",
  "barbell_count",
  "platform_count",
  "dumbbell_min_weight_kg",
  "dumbbell_max_weight_kg",
  "plate_min_weight_kg",
  "plate_max_weight_kg",
  "has_roman_chair",
  "has_dip_station",
  "has_pull_up_bar",
  "has_reverse_hyper",
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
  "elliptical_machine_count",
  "assault_runner_count",
  "ski_erg_count",
  "rower_count",
  "sled_count",
  "has_wall_ball",
  "wall_ball_count",
  "wall_ball_4kg_count",
  "wall_ball_6kg_count",
  "wall_ball_9kg_count",
  "wall_ball_10kg_count",
  "wall_ball_plate_9ft_count",
  "wall_ball_plate_10ft_count",
  "has_workout_sandbag",
  "has_boxing_sandbag",
  "sandbag_5kg_count",
  "sandbag_10kg_count",
  "sandbag_15kg_count",
  "sandbag_20kg_count",
  "sandbag_25kg_count",
  "sandbag_30kg_count",
  "has_kettlebell",
  "kettlebell_4kg_count",
  "kettlebell_6kg_count",
  "kettlebell_8kg_count",
  "kettlebell_10kg_count",
  "kettlebell_12kg_count",
  "kettlebell_14kg_count",
  "kettlebell_16kg_count",
  "kettlebell_18kg_count",
  "kettlebell_20kg_count",
  "kettlebell_24kg_count",
  "kettlebell_32kg_count",
  "cable_machine_count",
  "has_lat_pulldown_cable",
  "has_seated_row_cable",
  "smith_machine_count",
  "has_hack_squat",
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
  "has_multi_press_machine",
  "has_multi_hip_machine",
  "has_stretching_machine",
  "has_mobility_stick",
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
  "has_resistance_band",
  "has_foam_roller",
  "has_medicine_ball",
  "has_dip_belt",
  "has_weight_vest",
  "has_lifting_straps",
  "has_plyo_box",
  "has_balance_ball",
  "has_washroom",
  "has_bathroom",
  "has_yoga_block",
  "has_yoga_mat",
  "has_ab_crunch_bench",
  "has_preacher_curl_bench",
  "has_overhead_chair",
  "equipment_notes",
];

type JsonRecord = Record<string, unknown>;

export function pickFields(
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

export function buildGymPatchFromPayload(payload: SubmissionPayload) {
  const gymPatch = pickFields(payload.gym, GYM_FIELDS);
  const equipmentPatch = pickFields(payload.equipment, EQUIPMENT_FIELDS);

  if ("notes" in (payload.gym ?? {})) {
    equipmentPatch.equipment_notes = payload.gym?.notes ?? null;
  }

  return {
    ...gymPatch,
    ...equipmentPatch,
  };
}

export function buildChangedFields(
  before: JsonRecord | null | undefined,
  after: JsonRecord | null | undefined
) {
  if (!after) return null;

  const changed: JsonRecord = {};
  for (const [key, value] of Object.entries(after)) {
    if (
      key === "data_source" ||
      key === "created_at" ||
      key === "updated_at" ||
      key === "last_reported_at"
    ) {
      continue;
    }
    if (!before || !isEqualJsonValue(before[key], value)) {
      changed[key] = value;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}

function isEqualJsonValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => isEqualJsonValue(item, right[index]));
  }

  if (isPlainRecord(left) || isPlainRecord(right)) {
    if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (!isEqualJsonValue(leftKeys, rightKeys)) return false;
    return leftKeys.every((key) => isEqualJsonValue(left[key], right[key]));
  }

  return false;
}

function isPlainRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function buildSubmissionPayloadFromGymSnapshot(snapshot: JsonRecord) {
  const gym = pickFields(snapshot, GYM_FIELDS);
  const equipment = pickFields(snapshot, EQUIPMENT_FIELDS);

  if ("equipment_notes" in equipment) {
    gym.notes = equipment.equipment_notes ?? null;
  }

  return { gym, equipment };
}

export async function insertSubmissionRecord({
  supabase = createAdminClient(),
  gymId,
  submittedByUserId = null,
  reviewedByUserId = null,
  submissionType,
  status = "approved",
  actorType,
  actionType,
  payload,
  changedFields = null,
  reviewedAt = null,
  reviewNotes = null,
}: {
  supabase?: ReturnType<typeof createAdminClient>;
  gymId: string | null;
  submittedByUserId?: string | null;
  reviewedByUserId?: string | null;
  submissionType:
    | "add_gym"
    | "edit_gym_info"
    | "add_equipment"
    | "edit_equipment"
    | "remove_equipment"
    | "upload_photo"
    | "delete_gym";
  status?: "pending" | "approved" | "rejected";
  actorType: SubmissionActorType;
  actionType: SubmissionActionType;
  payload: SubmissionPayload;
  changedFields?: JsonRecord | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
}) {
  const { error } = await supabase.from("gym_update_submissions").insert({
    gym_id: gymId,
    submitted_by_user_id: submittedByUserId,
    submission_type: submissionType,
    status,
    payload,
    changed_fields: changedFields,
    action_type: actionType,
    actor_type: actorType,
    reviewed_by_user_id: reviewedByUserId,
    reviewed_at: reviewedAt,
    review_notes: reviewNotes,
  });

  if (error) {
    throw new Error(error.message);
  }
}
