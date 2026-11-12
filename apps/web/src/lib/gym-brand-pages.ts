import { GYM_CHAINS, type GymSummary } from "@gymory/shared";
import { DISTRICT_PAGE_DEFINITIONS } from "./district-pages";

export function getGymBrand(slug: string) {
  return GYM_CHAINS.find((chain) => chain.slug === slug) ?? null;
}

export function getGymBrandForGym(gymSlug: string) {
  return GYM_CHAINS.find((chain) => chain.slugPrefixes.some((prefix) => gymSlug.startsWith(prefix))) ?? null;
}

export function getIndexableGymBrandSlugs(gyms: { slug: string }[]) {
  return GYM_CHAINS.filter((chain) => gyms.some((gym) => chain.slugPrefixes.some((prefix) => gym.slug.startsWith(prefix))))
    .map((chain) => chain.slug);
}

export type GymBrandSummaryRow = Pick<GymSummary,
  "district_code" | "rack_count" | "dumbbell_max_weight_kg" | "treadmill_count" |
  "rower_count" | "has_bathroom" | "has_changing_room" | "has_free_water">;

export const GYM_BRAND_FEATURES = [
  { key: "racks", matches: (gym: GymBrandSummaryRow) => (gym.rack_count ?? 0) > 0 },
  { key: "dumbbells", matches: (gym: GymBrandSummaryRow) => (gym.dumbbell_max_weight_kg ?? 0) > 0 },
  { key: "treadmills", matches: (gym: GymBrandSummaryRow) => (gym.treadmill_count ?? 0) > 0 },
  { key: "rowers", matches: (gym: GymBrandSummaryRow) => (gym.rower_count ?? 0) > 0 },
  { key: "bathrooms", matches: (gym: GymBrandSummaryRow) => gym.has_bathroom === true },
  { key: "changingRooms", matches: (gym: GymBrandSummaryRow) => gym.has_changing_room === true },
  { key: "drinkingWater", matches: (gym: GymBrandSummaryRow) => gym.has_free_water === true },
] as const;

export function summarizeGymBrand(gyms: GymBrandSummaryRow[]) {
  return {
    totalCount: gyms.length,
    districts: DISTRICT_PAGE_DEFINITIONS.map((district) => ({
      ...district,
      count: gyms.filter((gym) => gym.district_code === district.code).length,
    })).filter((district) => district.count > 0),
    features: GYM_BRAND_FEATURES.map((feature) => ({
      key: feature.key,
      count: gyms.filter(feature.matches).length,
    })).filter((feature) => feature.count > 0),
  };
}
