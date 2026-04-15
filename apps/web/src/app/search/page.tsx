import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/db/supabase-server";
import { searchParamsSchema } from "@gymory/shared";
import type { GymSummary } from "@gymory/shared";
import { SearchFilters } from "@/components/search/SearchFilters";
import { GymList } from "@/components/search/GymList";

export const metadata: Metadata = {
  title: "Search Gyms",
  description: "Search nearby gyms by equipment, location, and size.",
};

async function fetchGyms(rawParams: Record<string, string | string[] | undefined>): Promise<GymSummary[]> {
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
      "id, name, slug, district, address, lat, lng, size_category, rack_count, dumbbell_max_weight_kg, assault_bike_count, ski_erg_count, rower_count, is_verified, equipment_last_verified_at"
    )
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  if (params.district) query = query.eq("district", params.district);
  if (params.minRackCount) query = query.gte("rack_count", params.minRackCount);
  if (params.minDumbbellWeight) query = query.gte("dumbbell_max_weight_kg", params.minDumbbellWeight);
  if (params.hasAssaultBike === "true") query = query.gt("assault_bike_count", 0);
  if (params.hasSkiErg === "true") query = query.gt("ski_erg_count", 0);
  if (params.hasRower === "true") query = query.gt("rower_count", 0);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as GymSummary[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const gyms = await fetchGyms(searchParams);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back
          </a>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Find a gym</h1>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters — client component, needs Suspense for useSearchParams */}
          <Suspense fallback={<div className="w-full md:w-64 shrink-0" />}>
            <SearchFilters />
          </Suspense>

          {/* Results */}
          <GymList gyms={gyms} />
        </div>
      </div>
    </main>
  );
}
