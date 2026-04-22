import { NextRequest, NextResponse } from "next/server";
import { searchGyms } from "@/lib/db/queries/search-gyms";

// GET /api/search?district=...&page=...&pageSize=...
export async function GET(request: NextRequest) {
  const result = await searchGyms(Object.fromEntries(request.nextUrl.searchParams));
  return NextResponse.json(result);
}
