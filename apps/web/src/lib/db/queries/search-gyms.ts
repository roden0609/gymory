import type { GymSummary } from "@gymory/shared";
import { getGymChainsBySlug, searchParamsSchema } from "@gymory/shared";
import { getTrainingPageDefinition } from "@/lib/training-pages";
import { createClient } from "../supabase-server";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type PaginatedGymSearchResult = {
  gyms: GymSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
export const GYM_SEARCH_COLUMNS = [
  "id",
  "name",
  "name_zh",
  "slug",
  "district_code",
  "address",
  "address_zh",
  "lat",
  "lng",
  "size_category",
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
  "has_washroom",
  "has_bathroom",
  "has_changing_room",
  "has_free_water",
  "has_dry_sauna",
  "has_wet_sauna",
  "has_ice_bath",
  "has_yoga_block",
  "has_yoga_mat",
  "has_ab_crunch_bench",
  "has_torso_rotation_machine",
  "has_ab_crunch_machine",
  "equipment_notes",
  "is_verified",
  "is_hyrox_official",
  "hyrox_partner_id",
  "hyrox_source_url",
  "hyrox_source_synced_at",
  "data_accuracy_status",
  "equipment_last_verified_at",
  "updated_at",
].join(", ");

export async function searchGyms(
  rawParams: RawSearchParams
): Promise<PaginatedGymSearchResult> {
  const parsed = searchParamsSchema.safeParse({
    collection: rawParams.collection,
    district: rawParams.district,
    userLat: rawParams.userLat,
    userLng: rawParams.userLng,
    brandSlugs: rawParams.brandSlugs,
    gymChains: rawParams.gymChains,
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    minRackCount: rawParams.minRackCount,
    minPlatformCount: rawParams.minPlatformCount,
    minDumbbellWeight: rawParams.minDumbbellWeight,
    minPlateWeight: rawParams.minPlateWeight,
    hasAssaultBike: rawParams.hasAssaultBike,
    hasSkiErg: rawParams.hasSkiErg,
    hasRower: rawParams.hasRower,
    hasSled: rawParams.hasSled,
    hasWallBallPlate: rawParams.hasWallBallPlate,
    hasWallBall: rawParams.hasWallBall,
    hasSandbag: rawParams.hasSandbag,
    hasKettlebell: rawParams.hasKettlebell,
    hasTreadmill: rawParams.hasTreadmill,
    hasExerciseBike: rawParams.hasExerciseBike,
    hasClimber: rawParams.hasClimber,
    hasCableMachine: rawParams.hasCableMachine,
    hasLatPulldownCable: rawParams.hasLatPulldownCable,
    hasSeatedRowCable: rawParams.hasSeatedRowCable,
    hasSmithMachine: rawParams.hasSmithMachine,
    hasBicepCurlMachine: rawParams.hasBicepCurlMachine,
    hasTricepExtensionMachine: rawParams.hasTricepExtensionMachine,
    hasChestPressMachine: rawParams.hasChestPressMachine,
    hasInclineChestPressMachine: rawParams.hasInclineChestPressMachine,
    hasIsoLateralChestPressMachine: rawParams.hasIsoLateralChestPressMachine,
    hasPecDeckMachine: rawParams.hasPecDeckMachine,
    hasChestFlyMachine: rawParams.hasChestFlyMachine,
    hasLatPulldownMachine: rawParams.hasLatPulldownMachine,
    hasSeatedRowMachine: rawParams.hasSeatedRowMachine,
    hasBackExtensionMachine: rawParams.hasBackExtensionMachine,
    hasIsoLateralRowMachine: rawParams.hasIsoLateralRowMachine,
    hasTBarRowMachine: rawParams.hasTBarRowMachine,
    hasLateralRaiseMachine: rawParams.hasLateralRaiseMachine,
    hasReverseFlyMachine: rawParams.hasReverseFlyMachine,
    hasShoulderPressMachine: rawParams.hasShoulderPressMachine,
    hasIsoLateralShoulderPressMachine:
      rawParams.hasIsoLateralShoulderPressMachine,
    hasHipAbductorMachine: rawParams.hasHipAbductorMachine,
    hasHipAdductorMachine: rawParams.hasHipAdductorMachine,
    hasLegExtensionMachine: rawParams.hasLegExtensionMachine,
    hasLegPressMachine: rawParams.hasLegPressMachine,
    hasSeatedLegPressMachine: rawParams.hasSeatedLegPressMachine,
    hasLyingLegCurlMachine: rawParams.hasLyingLegCurlMachine,
    hasSeatedLegCurlMachine: rawParams.hasSeatedLegCurlMachine,
    hasSeatedCalfRaiseMachine: rawParams.hasSeatedCalfRaiseMachine,
    hasSquatMachine: rawParams.hasSquatMachine,
    hasHackSquat: rawParams.hasHackSquat,
    hasDeadliftPlatform: rawParams.hasDeadliftPlatform,
    hasStandingCalfRaiseMachine: rawParams.hasStandingCalfRaiseMachine,
    hasBattleRope: rawParams.hasBattleRope,
    hasFoamRoller: rawParams.hasFoamRoller,
    hasMedicineBall: rawParams.hasMedicineBall,
    hasDipBelt: rawParams.hasDipBelt,
    hasWeightVest: rawParams.hasWeightVest,
    hasLiftingStraps: rawParams.hasLiftingStraps,
    hasPlyoBox: rawParams.hasPlyoBox,
    hasBalanceBall: rawParams.hasBalanceBall,
    hasWashroom: rawParams.hasWashroom,
    hasBathroom: rawParams.hasBathroom,
    minSize: rawParams.minSize,
  });

  if (!parsed.success) {
    return {
      gyms: [],
      totalCount: 0,
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 0,
      hasNextPage: false,
    };
  }

  const params = parsed.data;
  const page = params.page ?? DEFAULT_PAGE;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const collection =
    typeof params.collection === "string"
      ? getTrainingPageDefinition(params.collection)
      : null;

  const supabase = await createClient();

  let query = supabase
    .from("gyms")
    .select(GYM_SEARCH_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (params.brandSlugs && params.brandSlugs.length > 0) {
    const { data: brands, error: brandsError } = await supabase
      .from("equipment_brands")
      .select("id")
      .in("slug", params.brandSlugs);

    if (brandsError || !brands || brands.length === 0) {
      return {
        gyms: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
      };
    }

    const brandIds = brands.map((brand) => brand.id);
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("gym_brand_inventory")
      .select("gym_id")
      .in("brand_id", brandIds);

    if (inventoryError || !inventoryRows || inventoryRows.length === 0) {
      return {
        gyms: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
      };
    }

    const matchedGymIds = [...new Set(inventoryRows.map((row) => row.gym_id))];
    if (matchedGymIds.length === 0) {
      return {
        gyms: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
      };
    }

    query = query.in("id", matchedGymIds);
  }

  if (params.gymChains && params.gymChains.length > 0) {
    const chains = getGymChainsBySlug(params.gymChains);
    const slugPatterns = chains.flatMap((chain) => chain.slugPrefixes);

    if (slugPatterns.length === 0) {
      return {
        gyms: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
      };
    }

    query = query.or(
      slugPatterns.map((prefix) => `slug.like.${prefix}*`).join(",")
    );
  }

  if (params.district) query = query.eq("district_code", params.district);
  if (params.minRackCount) query = query.gte("rack_count", params.minRackCount);
  if (params.minPlatformCount) {
    query = query.gte("platform_count", params.minPlatformCount);
  }
  if (params.minDumbbellWeight) {
    query = query.gte("dumbbell_max_weight_kg", params.minDumbbellWeight);
  }
  if (params.minPlateWeight) {
    query = query.lte("plate_min_weight_kg", params.minPlateWeight);
  }
  if (params.hasAssaultBike === "true") query = query.gt("assault_bike_count", 0);
  if (params.hasSkiErg === "true") query = query.gt("ski_erg_count", 0);
  if (params.hasRower === "true") query = query.gt("rower_count", 0);
  if (params.hasSled === "true") query = query.gt("sled_count", 0);
  if (params.hasWallBallPlate === "true") {
    query = query.or(
      "wall_ball_plate_9ft_count.gt.0,wall_ball_plate_10ft_count.gt.0"
    );
  }
  if (params.hasWallBall === "true") {
    query = query.or(
      "has_wall_ball.eq.true,wall_ball_count.gt.0,wall_ball_4kg_count.gt.0,wall_ball_6kg_count.gt.0,wall_ball_8kg_count.gt.0,wall_ball_9kg_count.gt.0,wall_ball_10kg_count.gt.0,wall_ball_plate_9ft_count.gt.0,wall_ball_plate_10ft_count.gt.0"
    );
  }
  if (params.hasSandbag === "true") query = query.eq("has_workout_sandbag", true);
  if (params.hasKettlebell === "true") query = query.eq("has_kettlebell", true);
  if (params.hasTreadmill === "true") query = query.gt("treadmill_count", 0);
  if (params.hasExerciseBike === "true") {
    query = query.gt("exercise_bike_count", 0);
  }
  if (params.hasClimber === "true") query = query.gt("climber_count", 0);
  if (params.hasCableMachine === "true") {
    query = query.gt("cable_machine_count", 0);
  }
  if (params.hasLatPulldownCable === "true") {
    query = query.eq("has_lat_pulldown_cable", true);
  }
  if (params.hasSeatedRowCable === "true") {
    query = query.eq("has_seated_row_cable", true);
  }
  if (params.hasSmithMachine === "true") query = query.gt("smith_machine_count", 0);
  if (params.hasBicepCurlMachine === "true") {
    query = query.eq("has_bicep_curl_machine", true);
  }
  if (params.hasTricepExtensionMachine === "true") {
    query = query.eq("has_tricep_extension_machine", true);
  }
  if (params.hasChestPressMachine === "true") {
    query = query.eq("has_chest_press_machine", true);
  }
  if (params.hasInclineChestPressMachine === "true") {
    query = query.eq("has_incline_chest_press_machine", true);
  }
  if (params.hasIsoLateralChestPressMachine === "true") {
    query = query.eq("has_iso_lateral_chest_press_machine", true);
  }
  if (params.hasPecDeckMachine === "true") {
    query = query.eq("has_pec_deck_machine", true);
  }
  if (params.hasChestFlyMachine === "true") {
    query = query.eq("has_chest_fly_machine", true);
  }
  if (params.hasLatPulldownMachine === "true") {
    query = query.eq("has_lat_pulldown_machine", true);
  }
  if (params.hasSeatedRowMachine === "true") {
    query = query.eq("has_seated_row_machine", true);
  }
  if (params.hasBackExtensionMachine === "true") {
    query = query.eq("has_back_extension_machine", true);
  }
  if (params.hasIsoLateralRowMachine === "true") {
    query = query.eq("has_iso_lateral_row_machine", true);
  }
  if (params.hasTBarRowMachine === "true") {
    query = query.eq("has_t_bar_row_machine", true);
  }
  if (params.hasLateralRaiseMachine === "true") {
    query = query.eq("has_lateral_raise_machine", true);
  }
  if (params.hasReverseFlyMachine === "true") {
    query = query.eq("has_reverse_fly_machine", true);
  }
  if (params.hasShoulderPressMachine === "true") {
    query = query.eq("has_shoulder_press_machine", true);
  }
  if (params.hasIsoLateralShoulderPressMachine === "true") {
    query = query.eq("has_iso_lateral_shoulder_press_machine", true);
  }
  if (params.hasHipAbductorMachine === "true") {
    query = query.eq("has_hip_abductor_machine", true);
  }
  if (params.hasHipAdductorMachine === "true") {
    query = query.eq("has_hip_adductor_machine", true);
  }
  if (params.hasLegExtensionMachine === "true") {
    query = query.eq("has_leg_extension_machine", true);
  }
  if (params.hasLegPressMachine === "true") {
    query = query.eq("has_leg_press_machine", true);
  }
  if (params.hasSeatedLegPressMachine === "true") {
    query = query.eq("has_seated_leg_press_machine", true);
  }
  if (params.hasLyingLegCurlMachine === "true") {
    query = query.eq("has_lying_leg_curl_machine", true);
  }
  if (params.hasSeatedLegCurlMachine === "true") {
    query = query.eq("has_seated_leg_curl_machine", true);
  }
  if (params.hasSeatedCalfRaiseMachine === "true") {
    query = query.eq("has_seated_calf_raise_machine", true);
  }
  if (params.hasSquatMachine === "true") query = query.eq("has_squat_machine", true);
  if (params.hasHackSquat === "true") query = query.eq("has_hack_squat", true);
  if (params.hasDeadliftPlatform === "true") {
    query = query.or("has_deadlift_platform.eq.true,platform_count.gt.0");
  }
  if (params.hasStandingCalfRaiseMachine === "true") {
    query = query.eq("has_standing_calf_raise_machine", true);
  }
  if (params.hasBattleRope === "true") query = query.eq("has_battle_rope", true);
  if (params.hasFoamRoller === "true") query = query.eq("has_foam_roller", true);
  if (params.hasMedicineBall === "true") {
    query = query.eq("has_medicine_ball", true);
  }
  if (params.hasDipBelt === "true") query = query.eq("has_dip_belt", true);
  if (params.hasWeightVest === "true") query = query.eq("has_weight_vest", true);
  if (params.hasLiftingStraps === "true") {
    query = query.eq("has_lifting_straps", true);
  }
  if (params.hasPlyoBox === "true") query = query.eq("has_plyo_box", true);
  if (params.hasBalanceBall === "true") {
    query = query.eq("has_balance_ball", true);
  }
  if (params.hasWashroom === "true") query = query.eq("has_washroom", true);
  if (params.hasBathroom === "true") query = query.eq("has_bathroom", true);
  if (params.minSize) query = query.gte("estimated_size_sqft", params.minSize);

  const { data, error, count } = await query;
  if (error) {
    return {
      gyms: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNextPage: false,
    };
  }

  const allGyms = ((data ?? []) as unknown as GymSummary[]).filter((gym) =>
    collection ? collection.matchesGym(gym) : true
  );

  const gymIds = allGyms.map((gym) => gym.id);
  if (gymIds.length > 0) {
    const { data: votes } = await supabase
      .from("gym_accuracy_votes")
      .select("gym_id, vote")
      .in("gym_id", gymIds);

    const tallies = new Map<
      string,
      { likeCount: number; dislikeCount: number; totalVotes: number }
    >();

    for (const vote of votes ?? []) {
      const current = tallies.get(vote.gym_id) ?? {
        likeCount: 0,
        dislikeCount: 0,
        totalVotes: 0,
      };

      if (vote.vote === "like") current.likeCount += 1;
      if (vote.vote === "dislike") current.dislikeCount += 1;
      current.totalVotes += 1;
      tallies.set(vote.gym_id, current);
    }

    for (const gym of allGyms) {
      const tally = tallies.get(gym.id);
      gym.accuracy_like_count = tally?.likeCount ?? 0;
      gym.accuracy_dislike_count = tally?.dislikeCount ?? 0;
      gym.accuracy_total_votes = tally?.totalVotes ?? 0;
    }
  }

  const hasUserLocation =
    typeof params.userLat === "number" &&
    Number.isFinite(params.userLat) &&
    typeof params.userLng === "number" &&
    Number.isFinite(params.userLng);

  const sortedGyms = [...allGyms].sort((a, b) => {
    if (hasUserLocation) {
      const aDistance = distanceKm(params.userLat!, params.userLng!, a.lat, a.lng);
      const bDistance = distanceKm(params.userLat!, params.userLng!, b.lat, b.lng);
      if (aDistance !== bDistance) return aDistance - bDistance;
    }

    const accuracyDiff = accuracyScore(b) - accuracyScore(a);
    if (accuracyDiff !== 0) return accuracyDiff;

    const updatedDiff = timestampMs(b.updated_at) - timestampMs(a.updated_at);
    if (updatedDiff !== 0) return updatedDiff;

    return a.slug.localeCompare(b.slug);
  });

  const totalCount = collection ? sortedGyms.length : count ?? sortedGyms.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const gyms = sortedGyms.slice(from, to + 1);

  return {
    gyms,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

function accuracyScore(gym: GymSummary): number {
  const statusScore = gym.data_accuracy_status === "normal" ? 1000 : 0;
  const voteScore =
    (gym.accuracy_like_count ?? 0) -
    (gym.accuracy_dislike_count ?? 0) +
    Math.min(gym.accuracy_total_votes ?? 0, 20) * 0.1;
  const verifiedScore = gym.is_verified ? 50 : 0;
  return statusScore + voteScore + verifiedScore;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function distanceKm(
  originLat: number,
  originLng: number,
  targetLat: number | null,
  targetLng: number | null
): number {
  if (
    targetLat === null ||
    targetLng === null ||
    !Number.isFinite(targetLat) ||
    !Number.isFinite(targetLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
