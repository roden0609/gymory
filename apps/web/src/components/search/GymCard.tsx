"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { GymSummary } from "@gymory/shared";
import { getHkDistrictLabel } from "@gymory/shared";

function EquipmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}

function hasPositiveCount(count: number | null) {
  if (count === null) return null;
  return count > 0 ? count : null;
}

const EQUIPMENT_DATA_KEYS: Array<keyof GymSummary> = [
  "rack_count",
  "bench_count",
  "barbell_count",
  "platform_count",
  "dumbbell_min_weight_kg",
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
  "elliptical_machine_count",
  "assault_runner_count",
  "ski_erg_count",
  "rower_count",
  "sled_count",
  "has_wall_ball",
  "wall_ball_count",
  "wall_ball_4kg_count",
  "wall_ball_6kg_count",
  "wall_ball_8kg_count",
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
  "has_smith_machine",
  "has_deadlift_platform",
  "has_pull_up_bar",
  "has_dip_station",
  "has_trx",
  "has_resistance_band",
  "has_battle_ropes",
  "has_rings",
  "has_glute_ham_developer",
  "has_reverse_hyper",
  "has_farmers_handles",
  "has_preacher_curl_bench",
  "has_bicep_curl_machine",
  "has_tricep_extension_machine",
  "has_dip_machine",
  "has_chest_press_machine",
  "has_incline_chest_press_machine",
  "has_decline_chest_press_machine",
  "has_bench_rack",
  "has_incline_bench_rack",
  "has_iso_lateral_chest_press_machine",
  "has_pec_deck_machine",
  "has_chest_fly_machine",
  "has_lat_pulldown_machine",
  "has_seated_row_machine",
  "has_back_extension_machine",
  "has_iso_lateral_row_machine",
  "has_t_bar_row_machine",
  "has_pull_over_machine",
  "has_overhead_chair",
  "has_lateral_raise_machine",
  "has_standing_lateral_raise_machine",
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
  "has_hack_squat",
  "has_belt_squat_machine",
  "has_standing_calf_raise_machine",
  "has_glute_extension_machine",
  "has_hip_thrust_machine",
  "has_battle_rope",
  "has_foam_roller",
  "has_medicine_ball",
  "has_exercise_stepper",
  "has_ab_roller",
  "has_massage_ball",
  "has_dip_belt",
  "has_weight_vest",
  "has_lifting_straps",
  "has_plyo_box",
  "has_balance_ball",
  "has_yoga_block",
  "has_yoga_mat",
  "has_ab_crunch_bench",
  "has_torso_rotation_machine",
  "has_ab_crunch_machine",
  "equipment_notes",
];

function hasKnownEquipmentData(gym: GymSummary) {
  return EQUIPMENT_DATA_KEYS.some((key) => {
    const value = gym[key];
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
}

export function GymCard({ gym }: { gym: GymSummary }) {
  const locale = useLocale() as "en" | "zh-HK";
  const t = useTranslations("search");
  const tGym = useTranslations("gym");
  const displayName = locale === "zh-HK" && gym.name_zh ? gym.name_zh : gym.name;
  const displayAddress =
    locale === "zh-HK" && gym.address_zh ? gym.address_zh : gym.address;
  const districtLabel = getHkDistrictLabel(gym.district_code, locale);
  const equipmentHighlights: string[] = [];

  const rackCount = hasPositiveCount(gym.rack_count);
  if (rackCount) equipmentHighlights.push(t("rackBadge", { count: rackCount }));
  if (gym.dumbbell_max_weight_kg) {
    equipmentHighlights.push(
      t("dumbbellMaxBadge", { weight: gym.dumbbell_max_weight_kg })
    );
  }
  if (gym.plate_max_weight_kg) {
    equipmentHighlights.push(
      t("plateMaxBadge", { weight: gym.plate_max_weight_kg })
    );
  }
  const assaultBikeCount = hasPositiveCount(gym.assault_bike_count);
  if (assaultBikeCount) {
    equipmentHighlights.push(
      t("assaultBikeBadge", { count: assaultBikeCount })
    );
  }
  const skiErgCount = hasPositiveCount(gym.ski_erg_count);
  if (skiErgCount) equipmentHighlights.push(t("skiErgBadge", { count: skiErgCount }));
  const rowerCount = hasPositiveCount(gym.rower_count);
  if (rowerCount) equipmentHighlights.push(t("rowerBadge", { count: rowerCount }));
  const sledCount = hasPositiveCount(gym.sled_count);
  if (sledCount) equipmentHighlights.push(t("sledBadge", { count: sledCount }));
  if (
    gym.has_wall_ball ||
    (gym.wall_ball_count !== null && gym.wall_ball_count > 0) ||
    (gym.wall_ball_4kg_count !== null && gym.wall_ball_4kg_count > 0) ||
    (gym.wall_ball_6kg_count !== null && gym.wall_ball_6kg_count > 0) ||
    (gym.wall_ball_8kg_count !== null && gym.wall_ball_8kg_count > 0) ||
    (gym.wall_ball_9kg_count !== null && gym.wall_ball_9kg_count > 0)
  ) {
    equipmentHighlights.push(tGym("wallBall"));
  }

  const likeCount = gym.accuracy_like_count ?? 0;
  const dislikeCount = gym.accuracy_dislike_count ?? 0;
  const hasAnyEquipmentData = hasKnownEquipmentData(gym);

  return (
    <article className="rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-400 hover:shadow-sm">
      <Link href={`/gyms/${gym.slug}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{displayName}</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {districtLabel}
              {displayAddress ? ` · ${displayAddress}` : ""}
            </p>
          </div>

          {gym.is_verified && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {tGym("verified")}
            </span>
          )}
        </div>

        {equipmentHighlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {equipmentHighlights.map((label) => (
              <EquipmentBadge key={label} label={label} />
            ))}
          </div>
        )}
      </Link>

      {equipmentHighlights.length === 0 && !hasAnyEquipmentData && (
        <div className="-mt-2 px-5 pb-1">
          <Link
            href={`/submit?gymId=${gym.id}&returnTo=/gyms/${gym.slug}`}
            className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline"
          >
            {t("equipmentMissingCta")}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-5 pb-5 pt-3 text-xs text-gray-500">
        <span className="font-medium text-gray-600">{t("accuracyHeading")}:</span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👍 {likeCount}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
          👎 {dislikeCount}
        </span>
      </div>
    </article>
  );
}
