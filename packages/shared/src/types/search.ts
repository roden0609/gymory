import { z } from "zod";

const brandSlugsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));

const commaSeparatedListSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));

export const searchParamsSchema = z.object({
  collection: z.string().optional(),
  district: z.string().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  brandSlugs: brandSlugsSchema.optional(),
  gymChains: commaSeparatedListSchema.optional(),
  minRackCount: z.coerce.number().min(0).optional(),
  minPlatformCount: z.coerce.number().min(0).optional(),
  minDumbbellWeight: z.coerce.number().min(0).optional(),
  minPlateWeight: z.coerce.number().min(0).optional(),
  hasAssaultBike: z.string().optional(),
  hasSkiErg: z.string().optional(),
  hasRower: z.string().optional(),
  hasSled: z.string().optional(),
  hasWallBallPlate: z.string().optional(),
  hasWallBall: z.string().optional(),
  hasSandbag: z.string().optional(),
  hasKettlebell: z.string().optional(),
  hasTreadmill: z.string().optional(),
  hasExerciseBike: z.string().optional(),
  hasClimber: z.string().optional(),
  hasCableMachine: z.string().optional(),
  hasLatPulldownCable: z.string().optional(),
  hasSeatedRowCable: z.string().optional(),
  hasSmithMachine: z.string().optional(),
  hasBicepCurlMachine: z.string().optional(),
  hasTricepExtensionMachine: z.string().optional(),
  hasChestPressMachine: z.string().optional(),
  hasInclineChestPressMachine: z.string().optional(),
  hasIsoLateralChestPressMachine: z.string().optional(),
  hasPecDeckMachine: z.string().optional(),
  hasChestFlyMachine: z.string().optional(),
  hasLatPulldownMachine: z.string().optional(),
  hasSeatedRowMachine: z.string().optional(),
  hasBackExtensionMachine: z.string().optional(),
  hasIsoLateralRowMachine: z.string().optional(),
  hasTBarRowMachine: z.string().optional(),
  hasLateralRaiseMachine: z.string().optional(),
  hasReverseFlyMachine: z.string().optional(),
  hasShoulderPressMachine: z.string().optional(),
  hasIsoLateralShoulderPressMachine: z.string().optional(),
  hasHipAbductorMachine: z.string().optional(),
  hasHipAdductorMachine: z.string().optional(),
  hasLegExtensionMachine: z.string().optional(),
  hasLegPressMachine: z.string().optional(),
  hasSeatedLegPressMachine: z.string().optional(),
  hasLyingLegCurlMachine: z.string().optional(),
  hasSeatedLegCurlMachine: z.string().optional(),
  hasSeatedCalfRaiseMachine: z.string().optional(),
  hasSquatMachine: z.string().optional(),
  hasHackSquat: z.string().optional(),
  hasDeadliftPlatform: z.string().optional(),
  hasStandingCalfRaiseMachine: z.string().optional(),
  hasBattleRope: z.string().optional(),
  hasFoamRoller: z.string().optional(),
  hasMedicineBall: z.string().optional(),
  hasDipBelt: z.string().optional(),
  hasWeightVest: z.string().optional(),
  hasLiftingStraps: z.string().optional(),
  hasPlyoBox: z.string().optional(),
  hasBalanceBall: z.string().optional(),
  hasWashroom: z.string().optional(),
  hasBathroom: z.string().optional(),
  minSize: z.coerce.number().min(0).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
