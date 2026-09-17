"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { ensureAppUser } from "@/lib/db/users";
import { gymMachineInventorySchema } from "@/lib/admin-equipment-validation";

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

async function authorize(locale: string) {
  return requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/gyms`,
    `/${locale}`
  );
}

function inventoryUrl(locale: string, gymId: string, result: string) {
  return `/${locale}/admin/gyms/${gymId}/equipment?${result}`;
}

function failureReason(error: unknown) {
  if (error instanceof z.ZodError) return "invalid";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return "duplicate";
  }
  if (message.includes("foreign key")) return "related";
  return "unknown";
}

export async function saveGymMachine(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  const gymId = textValue(formData, "gym_id");
  const firebaseUser = await authorize(locale);

  try {
    const parsed = gymMachineInventorySchema.parse({
      gym_id: gymId,
      equipment_id: textValue(formData, "equipment_id"),
      quantity: textValue(formData, "quantity"),
      condition: textValue(formData, "condition") || "unknown",
      notes: textValue(formData, "notes"),
    });
    const supabase = createAdminClient();
    const appUser = await ensureAppUser(firebaseUser, supabase);
    const verifiedAt = new Date().toISOString();
    const { error } = await supabase.from("gym_equipment_inventory").upsert(
      {
        gym_id: parsed.gym_id,
        equipment_id: parsed.equipment_id,
        quantity: parsed.quantity,
        condition: parsed.condition,
        notes: parsed.notes,
        verified_status: "admin_verified",
        source: "admin",
        added_by_user_id: appUser.id,
        verified_by_user_id: appUser.id,
        verified_at: verifiedAt,
      },
      { onConflict: "gym_id,equipment_id" }
    );
    if (error) throw new Error(error.message);
  } catch (error) {
    redirect(
      inventoryUrl(locale, gymId, `result=error&reason=${failureReason(error)}`)
    );
  }

  revalidatePath(`/${locale}/admin/gyms/${gymId}/equipment`);
  revalidatePath(`/${locale}/gyms`);
  redirect(inventoryUrl(locale, gymId, "result=success&action=save"));
}

export async function removeGymMachine(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  const gymId = textValue(formData, "gym_id");
  await authorize(locale);

  try {
    const machineId = z.string().uuid().parse(textValue(formData, "equipment_id"));
    z.string().uuid().parse(gymId);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("gym_equipment_inventory")
      .delete()
      .eq("gym_id", gymId)
      .eq("equipment_id", machineId);
    if (error) throw new Error(error.message);
  } catch (error) {
    redirect(
      inventoryUrl(locale, gymId, `result=error&reason=${failureReason(error)}`)
    );
  }

  revalidatePath(`/${locale}/admin/gyms/${gymId}/equipment`);
  revalidatePath(`/${locale}/gyms`);
  redirect(inventoryUrl(locale, gymId, "result=success&action=remove"));
}
