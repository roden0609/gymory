import type { GymSummary } from "@gymory/shared";
import { searchParamsSchema } from "@gymory/shared";
import { createClient } from "../supabase-server";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export async function searchGyms(
  rawParams: RawSearchParams
): Promise<GymSummary[]> {
  const parsed = searchParamsSchema.safeParse({
    district: rawParams.district,
    minRackCount: rawParams.minRackCount,
    minDumbbellWeight: rawParams.minDumbbellWeight,
    hasAssaultBike: rawParams.hasAssaultBike,
    hasSkiErg: rawParams.hasSkiErg,
    hasRower: rawParams.hasRower,
    minSize: rawParams.minSize,
  });

  if (!parsed.success) return [];

  const params = parsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("gyms")
    .select(
      "id, name, name_zh, slug, district_code, address, address_zh, lat, lng, size_category, rack_count, dumbbell_max_weight_kg, assault_bike_count, ski_erg_count, rower_count, is_verified, equipment_last_verified_at"
    )
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  if (params.district) query = query.eq("district_code", params.district);
  if (params.minRackCount) query = query.gte("rack_count", params.minRackCount);
  if (params.minDumbbellWeight) {
    query = query.gte("dumbbell_max_weight_kg", params.minDumbbellWeight);
  }
  if (params.hasAssaultBike === "true") query = query.gt("assault_bike_count", 0);
  if (params.hasSkiErg === "true") query = query.gt("ski_erg_count", 0);
  if (params.hasRower === "true") query = query.gt("rower_count", 0);
  if (params.minSize) query = query.gte("estimated_size_sqft", params.minSize);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as GymSummary[];
}
