import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";

// GET /api/gyms/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ gym: data });
}

// PATCH /api/gyms/[id] — update gym (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: verify admin session
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gyms")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gym: data });
}
