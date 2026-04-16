import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";
import { searchParamsSchema } from "@gymory/shared";

// GET /api/search?district=...&minRackCount=...&hasAssaultBike=...&minDumbbellWeight=...
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = searchParamsSchema.safeParse({
    district: searchParams.get("district"),
    minRackCount: searchParams.get("minRackCount"),
    minDumbbellWeight: searchParams.get("minDumbbellWeight"),
    hasAssaultBike: searchParams.get("hasAssaultBike"),
    hasSkiErg: searchParams.get("hasSkiErg"),
    hasRower: searchParams.get("hasRower"),
    minSize: searchParams.get("minSize"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const params = parsed.data;
  const supabase = await createClient();

  let query = supabase
    .from("gyms")
    .select("id, name, name_zh, slug, district_code, address, address_zh, lat, lng, size_category, rack_count, dumbbell_max_weight_kg, assault_bike_count, ski_erg_count, rower_count, is_verified, equipment_last_verified_at")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  if (params.district) query = query.eq("district_code", params.district);
  if (params.minRackCount) query = query.gte("rack_count", params.minRackCount);
  if (params.minDumbbellWeight) query = query.gte("dumbbell_max_weight_kg", params.minDumbbellWeight);
  if (params.hasAssaultBike === "true") query = query.gt("assault_bike_count", 0);
  if (params.hasSkiErg === "true") query = query.gt("ski_erg_count", 0);
  if (params.hasRower === "true") query = query.gt("rower_count", 0);
  if (params.minSize) query = query.gte("estimated_size_sqft", params.minSize);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ gyms: data });
}
