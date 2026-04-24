import { NextRequest, NextResponse } from "next/server";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";

// GET /api/gyms/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gym: data });
}
