import type { GymSummary } from "@gymory/shared";
import { searchParamsSchema } from "@gymory/shared";
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

export async function searchGyms(
  rawParams: RawSearchParams
): Promise<PaginatedGymSearchResult> {
  const parsed = searchParamsSchema.safeParse({
    district: rawParams.district,
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
    hasStandingCalfRaiseMachine: rawParams.hasStandingCalfRaiseMachine,
    hasBattleRope: rawParams.hasBattleRope,
    hasFoamRoller: rawParams.hasFoamRoller,
    hasMedicineBall: rawParams.hasMedicineBall,
    hasDipBelt: rawParams.hasDipBelt,
    hasWeightVest: rawParams.hasWeightVest,
    hasLiftingStraps: rawParams.hasLiftingStraps,
    hasPlyoBox: rawParams.hasPlyoBox,
    hasBalanceBall: rawParams.hasBalanceBall,
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

  const supabase = await createClient();

  let query = supabase
    .from("gyms")
    .select(
      "id, name, name_zh, slug, district_code, address, address_zh, lat, lng, size_category, rack_count, dumbbell_max_weight_kg, plate_min_weight_kg, plate_max_weight_kg, assault_bike_count, ski_erg_count, rower_count, sled_count, has_wall_ball, wall_ball_count, wall_ball_4kg_count, wall_ball_6kg_count, wall_ball_9kg_count, is_verified, equipment_last_verified_at",
      { count: "exact" }
    )
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("updated_at", { ascending: false });

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
  if (params.hasSandbag === "true") query = query.eq("has_sandbag", true);
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
  if (params.minSize) query = query.gte("estimated_size_sqft", params.minSize);

  const { data, error, count } = await query.range(from, to);
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

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    gyms: (data ?? []) as GymSummary[],
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
