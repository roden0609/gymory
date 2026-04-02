import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";

// GET /api/gyms — list all active gyms (admin use)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gyms: data });
}

// POST /api/gyms — create gym (admin only, auth checked server-side)
export async function POST(request: NextRequest) {
  // TODO: verify admin session via Firebase Admin SDK
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gyms")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gym: data }, { status: 201 });
}
