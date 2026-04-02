import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";
import { submissionSchema } from "@gymory/shared";

// POST /api/submissions — user submits a gym or equipment update (no login required)
export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("gym_update_submissions")
    .insert({
      gym_id: parsed.data.gymId ?? null,
      submission_type: parsed.data.submissionType,
      payload: parsed.data.payload,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data }, { status: 201 });
}
