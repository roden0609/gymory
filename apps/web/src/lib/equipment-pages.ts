export type EquipmentPageFilter =
  | { type: "gt"; field: string; value: number }
  | { type: "gte"; field: string; value: number }
  | { type: "eq"; field: string; value: boolean };

export type EquipmentPageDefinition = {
  slug: string;
  filters?: EquipmentPageFilter[];
  orFilter?: string;
  brandSlug?: string;
  searchParams: Record<string, string>;
};

export const EQUIPMENT_PAGE_DEFINITIONS: EquipmentPageDefinition[] = [
  {
    slug: "hack-squat",
    filters: [{ type: "eq", field: "has_hack_squat", value: true }],
    searchParams: { hasHackSquat: "true" },
  },
  {
    slug: "ski-erg",
    filters: [{ type: "gt", field: "ski_erg_count", value: 0 }],
    searchParams: { hasSkiErg: "true" },
  },
  {
    slug: "sled",
    filters: [{ type: "gt", field: "sled_count", value: 0 }],
    searchParams: { hasSled: "true" },
  },
  {
    slug: "power-rack",
    filters: [{ type: "gt", field: "rack_count", value: 0 }],
    searchParams: { minRackCount: "1" },
  },
  {
    slug: "deadlift-platform",
    orFilter: "has_deadlift_platform.eq.true,platform_count.gt.0",
    searchParams: { hasDeadliftPlatform: "true" },
  },
  {
    slug: "assault-bike",
    filters: [{ type: "gt", field: "assault_bike_count", value: 0 }],
    searchParams: { hasAssaultBike: "true" },
  },
  {
    slug: "rower",
    filters: [{ type: "gt", field: "rower_count", value: 0 }],
    searchParams: { hasRower: "true" },
  },
  {
    slug: "wall-ball",
    orFilter:
      "has_wall_ball.eq.true,wall_ball_count.gt.0,wall_ball_4kg_count.gt.0,wall_ball_6kg_count.gt.0,wall_ball_8kg_count.gt.0,wall_ball_9kg_count.gt.0,wall_ball_10kg_count.gt.0,wall_ball_plate_9ft_count.gt.0,wall_ball_plate_10ft_count.gt.0",
    searchParams: { hasWallBall: "true" },
  },
  {
    slug: "heavy-dumbbells",
    filters: [{ type: "gte", field: "dumbbell_max_weight_kg", value: 40 }],
    searchParams: { minDumbbellWeight: "40" },
  },
  {
    slug: "eleiko",
    brandSlug: "eleiko",
    searchParams: { brandSlugs: "eleiko" },
  },
] as const;

export type EquipmentPageSlug = (typeof EQUIPMENT_PAGE_DEFINITIONS)[number]["slug"];

export function getEquipmentPageDefinition(slug: string) {
  return EQUIPMENT_PAGE_DEFINITIONS.find((item) => item.slug === slug) ?? null;
}

export function getEquipmentSearchQuery(definition: EquipmentPageDefinition) {
  return new URLSearchParams(definition.searchParams).toString();
}
