import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseSessionUser, isAdminUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";

const inventoryItemSchema = z
  .object({
    equipmentCode: z.string().regex(/^[a-z][a-z0-9_]*$/),
    isPresent: z.boolean().nullable().optional(),
    quantity: z.number().int().nonnegative().nullable().optional(),
    remove: z.boolean().optional(),
  })
  .superRefine((item, context) => {
    if (item.remove) return;
    if (item.isPresent == null && item.quantity == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An inventory item must provide isPresent or quantity.",
      });
    }
  });

const inventoryPatchSchema = z.object({
  schemaVersion: z.literal(2),
  equipment: z.array(inventoryItemSchema).min(1),
});

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
    .from("gym_equipment_inventory")
    .select(
      "id, gym_id, equipment_code, is_present, quantity, created_at, updated_at, equipment_types(code, name_en, name_zh, category, parent_code, supports_quantity, aliases, is_active, display_order)"
    )
    .eq("gym_id", params.id)
    .order("equipment_code");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ equipment: data ?? [] });
}

export async function PUT(
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

  const parsed = inventoryPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const appUser = await ensureAppUser(user, supabase);
  const { data: auditId, error } = await supabase.rpc(
    "apply_gym_equipment_inventory_patch",
    {
      p_target_gym_id: params.id,
      p_inventory_items: parsed.data.equipment,
      p_submitted_by_user_id: appUser.id,
      p_reviewed_by_user_id: appUser.id,
      p_source_payload: parsed.data,
    }
  );

  if (error) {
    const status = error.message.includes("Gym not found") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ status: "ok", auditId });
}
