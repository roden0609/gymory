import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";

// GET /api/gyms — list all active gyms (admin use)
export async function GET() {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gyms: data });
}

// POST /api/gyms — create gym (admin only, auth checked server-side)
export async function POST(request: NextRequest) {
  const user = await getFirebaseSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gyms")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gym: data }, { status: 201 });
}
