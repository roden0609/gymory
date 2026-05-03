import { NextRequest, NextResponse } from "next/server";
import { searchGyms, type RawSearchParams } from "@/lib/db/queries/search-gyms";

export async function GET(request: NextRequest) {
  const result = await searchGyms(toRawSearchParams(request.nextUrl.searchParams));
  return NextResponse.json(result);
}

function toRawSearchParams(searchParams: URLSearchParams): RawSearchParams {
  const rawParams: RawSearchParams = {};

  for (const [key, value] of searchParams) {
    const currentValue = rawParams[key];
    if (Array.isArray(currentValue)) {
      currentValue.push(value);
    } else if (typeof currentValue === "string") {
      rawParams[key] = [currentValue, value];
    } else {
      rawParams[key] = value;
    }
  }

  return rawParams;
}
