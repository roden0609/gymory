import type { GymSummary } from "@gymory/shared";

export type TrainingSignal = {
  labelKey: string;
  count?: number;
};

export type TrainingPageDefinition = {
  slug: string;
  orFilter: string;
  equipmentLinks: string[];
  matchesGym: (gym: GymSummary) => boolean;
  getSignals: (gym: GymSummary) => TrainingSignal[];
};

function countSignal(labelKey: string, count: number | null): TrainingSignal | null {
  return count !== null && count > 0 ? { labelKey, count } : null;
}

function booleanSignal(
  labelKey: string,
  value: boolean | null
): TrainingSignal | null {
  return value ? { labelKey } : null;
}

function hasPositiveCount(count: number | null) {
  return count !== null && count > 0;
}

function hasPlateData(gym: GymSummary) {
  return gym.plate_min_weight_kg !== null || gym.plate_max_weight_kg !== null;
}

function countBooleans(values: Array<boolean | null>) {
  return values.filter(Boolean).length;
}

export const TRAINING_PAGE_DEFINITIONS: TrainingPageDefinition[] = [
  {
    slug: "hyrox-official-hong-kong",
    orFilter: "is_hyrox_official.eq.true",
    equipmentLinks: ["ski-erg", "sled", "rower", "wall-ball"],
    matchesGym: (gym) => gym.is_hyrox_official === true,
    getSignals: (gym) =>
      [
        gym.is_hyrox_official ? { labelKey: "hyroxOfficial" } : null,
        countSignal("assaultRunner", gym.assault_runner_count),
        countSignal("skiErg", gym.ski_erg_count),
        countSignal("sled", gym.sled_count),
        countSignal("rower", gym.rower_count),
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
  {
    slug: "hyrox-friendly-hong-kong",
    orFilter:
      "assault_runner_count.gt.0,ski_erg_count.gt.0,sled_count.gt.0,rower_count.gt.0,wall_ball_4kg_count.gt.0,wall_ball_6kg_count.gt.0,sandbag_10kg_count.gt.0,sandbag_20kg_count.gt.0,kettlebell_16kg_count.gt.0,kettlebell_24kg_count.gt.0",
    equipmentLinks: ["ski-erg", "sled", "rower", "wall-ball", "assault-bike"],
    matchesGym: (gym) =>
      hasPositiveCount(gym.assault_runner_count) &&
      hasPositiveCount(gym.ski_erg_count) &&
      hasPositiveCount(gym.sled_count) &&
      hasPositiveCount(gym.rower_count) &&
      hasPositiveCount(gym.wall_ball_4kg_count) &&
      hasPositiveCount(gym.wall_ball_6kg_count) &&
      hasPositiveCount(gym.sandbag_10kg_count) &&
      hasPositiveCount(gym.sandbag_20kg_count) &&
      hasPositiveCount(gym.kettlebell_16kg_count) &&
      hasPositiveCount(gym.kettlebell_24kg_count),
    getSignals: (gym) =>
      [
        countSignal("assaultRunner", gym.assault_runner_count),
        countSignal("skiErg", gym.ski_erg_count),
        countSignal("sled", gym.sled_count),
        countSignal("rower", gym.rower_count),
        countSignal("wallBall4kg", gym.wall_ball_4kg_count),
        countSignal("wallBall6kg", gym.wall_ball_6kg_count),
        countSignal("sandbag10kg", gym.sandbag_10kg_count),
        countSignal("sandbag20kg", gym.sandbag_20kg_count),
        countSignal("kettlebell16kg", gym.kettlebell_16kg_count),
        countSignal("kettlebell24kg", gym.kettlebell_24kg_count),
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
  {
    slug: "olympic-lifting-hong-kong",
    orFilter: "platform_count.gt.0,barbell_count.gt.0",
    equipmentLinks: ["deadlift-platform", "power-rack"],
    matchesGym: (gym) =>
      hasPositiveCount(gym.platform_count) &&
      hasPositiveCount(gym.barbell_count) &&
      hasPlateData(gym),
    getSignals: (gym) =>
      [
        countSignal("platforms", gym.platform_count),
        countSignal("barbells", gym.barbell_count),
        gym.plate_min_weight_kg !== null ? { labelKey: "smallestPlate" } : null,
        gym.plate_max_weight_kg !== null ? { labelKey: "heaviestPlate" } : null,
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
  {
    slug: "powerlifting-hong-kong",
    orFilter:
      "rack_count.gt.0,barbell_count.gt.0",
    equipmentLinks: ["power-rack", "deadlift-platform", "heavy-dumbbells"],
    matchesGym: (gym) =>
      hasPositiveCount(gym.rack_count) &&
      hasPositiveCount(gym.barbell_count) &&
      hasPlateData(gym),
    getSignals: (gym) =>
      [
        countSignal("racks", gym.rack_count),
        countSignal("barbells", gym.barbell_count),
        gym.plate_min_weight_kg !== null ? { labelKey: "smallestPlate" } : null,
        gym.plate_max_weight_kg !== null ? { labelKey: "heaviestPlate" } : null,
        countSignal("platforms", gym.platform_count),
        countSignal("benches", gym.bench_count),
        booleanSignal("deadliftPlatform", gym.has_deadlift_platform),
        booleanSignal("safetySquatBar", gym.has_safety_squat_bar),
        booleanSignal("trapBar", gym.has_trap_bar),
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
  {
    slug: "bodybuilding-hong-kong",
    orFilter:
      "has_chest_press_machine.eq.true,has_incline_chest_press_machine.eq.true,has_decline_chest_press_machine.eq.true,has_bench_rack.eq.true,has_incline_bench_rack.eq.true,has_iso_lateral_chest_press_machine.eq.true,has_pec_deck_machine.eq.true,has_chest_fly_machine.eq.true,has_lat_pulldown_machine.eq.true,has_seated_row_machine.eq.true,has_back_extension_machine.eq.true,has_iso_lateral_row_machine.eq.true,has_t_bar_row_machine.eq.true,has_pull_over_machine.eq.true,has_overhead_chair.eq.true,has_lateral_raise_machine.eq.true,has_standing_lateral_raise_machine.eq.true,has_reverse_fly_machine.eq.true,has_shoulder_press_machine.eq.true,has_iso_lateral_shoulder_press_machine.eq.true,has_multi_press_machine.eq.true,has_multi_hip_machine.eq.true,has_hip_abductor_machine.eq.true,has_hip_adductor_machine.eq.true,has_leg_extension_machine.eq.true,has_leg_press_machine.eq.true,has_seated_leg_press_machine.eq.true,has_lying_leg_curl_machine.eq.true,has_seated_leg_curl_machine.eq.true,has_seated_calf_raise_machine.eq.true,has_squat_machine.eq.true,has_hack_squat.eq.true,has_belt_squat_machine.eq.true,has_standing_calf_raise_machine.eq.true,has_glute_extension_machine.eq.true,has_hip_thrust_machine.eq.true",
    equipmentLinks: ["hack-squat", "heavy-dumbbells"],
    matchesGym: (gym) =>
      countBooleans([
        gym.has_chest_press_machine,
        gym.has_incline_chest_press_machine,
        gym.has_decline_chest_press_machine,
        gym.has_bench_rack,
        gym.has_incline_bench_rack,
        gym.has_iso_lateral_chest_press_machine,
        gym.has_pec_deck_machine,
        gym.has_chest_fly_machine,
      ]) >= 2 &&
      countBooleans([
        gym.has_lat_pulldown_machine,
        gym.has_seated_row_machine,
        gym.has_back_extension_machine,
        gym.has_iso_lateral_row_machine,
        gym.has_t_bar_row_machine,
        gym.has_pull_over_machine,
      ]) >= 2 &&
      countBooleans([
        gym.has_overhead_chair,
        gym.has_lateral_raise_machine,
        gym.has_standing_lateral_raise_machine,
        gym.has_reverse_fly_machine,
        gym.has_shoulder_press_machine,
        gym.has_iso_lateral_shoulder_press_machine,
        gym.has_multi_press_machine,
      ]) >= 2 &&
      countBooleans([
        gym.has_multi_hip_machine,
        gym.has_hip_abductor_machine,
        gym.has_hip_adductor_machine,
        gym.has_leg_extension_machine,
        gym.has_leg_press_machine,
        gym.has_seated_leg_press_machine,
        gym.has_lying_leg_curl_machine,
        gym.has_seated_leg_curl_machine,
        gym.has_seated_calf_raise_machine,
        gym.has_squat_machine,
        gym.has_hack_squat,
        gym.has_belt_squat_machine,
        gym.has_standing_calf_raise_machine,
        gym.has_glute_extension_machine,
        gym.has_hip_thrust_machine,
      ]) >= 2,
    getSignals: (gym) =>
      [
        booleanSignal("hackSquat", gym.has_hack_squat),
        booleanSignal("legPress", gym.has_leg_press_machine),
        booleanSignal("seatedLegPress", gym.has_seated_leg_press_machine),
        booleanSignal("chestPress", gym.has_chest_press_machine),
        booleanSignal("inclineChestPress", gym.has_incline_chest_press_machine),
        booleanSignal("pecDeck", gym.has_pec_deck_machine),
        booleanSignal("latPulldown", gym.has_lat_pulldown_machine),
        booleanSignal("seatedRow", gym.has_seated_row_machine),
        booleanSignal("lateralRaise", gym.has_lateral_raise_machine),
        booleanSignal("hipAbductor", gym.has_hip_abductor_machine),
        booleanSignal("hipAdductor", gym.has_hip_adductor_machine),
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
  {
    slug: "hybrid-training-hong-kong",
    orFilter:
      "has_plyo_box.eq.true,rack_count.gt.0,platform_count.gt.0,barbell_count.gt.0,ski_erg_count.gt.0,sled_count.gt.0,rower_count.gt.0,assault_bike_count.gt.0,treadmill_count.gt.0",
    equipmentLinks: [
      "power-rack",
      "deadlift-platform",
      "ski-erg",
      "sled",
      "rower",
      "assault-bike",
    ],
    matchesGym: (gym) =>
      gym.has_plyo_box === true &&
      (hasPositiveCount(gym.rack_count) ||
        hasPositiveCount(gym.platform_count) ||
        hasPositiveCount(gym.barbell_count)) &&
      (hasPositiveCount(gym.ski_erg_count) ||
        hasPositiveCount(gym.sled_count) ||
        hasPositiveCount(gym.rower_count) ||
        hasPositiveCount(gym.assault_bike_count) ||
        hasPositiveCount(gym.treadmill_count)),
    getSignals: (gym) =>
      [
        booleanSignal("plyoBox", gym.has_plyo_box),
        countSignal("racks", gym.rack_count),
        countSignal("platforms", gym.platform_count),
        countSignal("skiErg", gym.ski_erg_count),
        countSignal("sled", gym.sled_count),
        countSignal("rower", gym.rower_count),
        countSignal("assaultBike", gym.assault_bike_count),
        countSignal("treadmill", gym.treadmill_count),
        booleanSignal("kettlebells", gym.has_kettlebell),
        booleanSignal("wallBalls", gym.has_wall_ball),
      ].filter((signal): signal is TrainingSignal => Boolean(signal)),
  },
];

export function getTrainingPageDefinition(slug: string) {
  return TRAINING_PAGE_DEFINITIONS.find((item) => item.slug === slug) ?? null;
}

export function getTrainingSearchQuery(definition: TrainingPageDefinition) {
  return new URLSearchParams({ collection: definition.slug }).toString();
}
