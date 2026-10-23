"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { toSlug } from "@/lib/utils/slug";
import {
  equipmentTypeSchema,
  equipmentTypeCodeSchema,
  equipmentBrandSchema,
  equipmentMachineSchema,
} from "@/lib/admin-equipment-validation";

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

async function authorize(locale: string) {
  await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/equipment`,
    `/${locale}`
  );
}

function refreshCatalog() {
  for (const locale of ["en", "zh-HK"]) {
    for (const page of ["equipment", "brands", "equipment-types"]) {
      revalidatePath(`/${locale}/admin/${page}`);
    }
  }
  revalidatePath("/[locale]/gyms/[slug]", "page");
}

type CatalogEntity = "brand" | "machine" | "type";

async function runCatalogSave(
  locale: string,
  entity: CatalogEntity,
  operation: () => Promise<void>,
  action = "save"
) {
  const page = entity === "brand" ? "brands" : entity === "type" ? "equipment-types" : "equipment";
  try {
    await operation();
    refreshCatalog();
  } catch (error) {
    const reason = getFailureReason(error);
    redirect(
      `/${locale}/admin/${page}?result=error&entity=${entity}&reason=${reason}&action=${action}`
    );
  }

  redirect(`/${locale}/admin/${page}?result=success&entity=${entity}&action=${action}`);
}

function getFailureReason(error: unknown) {
  if (error instanceof z.ZodError) return "invalid";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("check constraint")) return "invalid";
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return "duplicate";
  }
  if (message.includes("foreign key") || message.includes("still referenced")) {
    return "related";
  }
  return "unknown";
}

export async function saveBrand(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "brand", async () => {
    const parsed = equipmentBrandSchema.parse({
      id: textValue(formData, "id") || undefined,
      name_en: textValue(formData, "name_en"),
      name_zh: textValue(formData, "name_zh"),
      country: textValue(formData, "country"),
      website_url: textValue(formData, "website_url"),
      is_active: checked(formData, "is_active"),
    });
    const supabase = createAdminClient();
    const payload = {
      name_en: parsed.name_en,
      name_zh: parsed.name_zh,
      country: parsed.country,
      website_url: parsed.website_url || null,
      is_active: parsed.is_active,
      slug: toSlug(parsed.name_en),
    };
    const result = parsed.id
      ? await supabase.from("equipment_brands").update(payload).eq("id", parsed.id)
      : await supabase.from("equipment_brands").insert(payload);
    if (result.error) throw new Error(result.error.message);
  });
}

export async function saveMachine(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "machine", async () => {
    const parsed = equipmentMachineSchema.parse({
      id: textValue(formData, "id") || undefined,
      brand_id: textValue(formData, "brand_id"),
      equipment_type_code: textValue(formData, "equipment_type_code"),
      labels: formData.getAll("labels"),
      name: textValue(formData, "name"),
      name_zh: textValue(formData, "name_zh"),
      series: textValue(formData, "series"),
      model_number: textValue(formData, "model_number"),
      product_url: textValue(formData, "product_url"),
      description: textValue(formData, "description"),
      status: textValue(formData, "status"),
      source_type: textValue(formData, "source_type"),
      aliases: textValue(formData, "aliases"),
    });
    const supabase = createAdminClient();
    const payload = {
      brand_id: parsed.brand_id,
      equipment_type_code: parsed.equipment_type_code,
      labels: parsed.labels,
      name: parsed.name,
      name_zh: parsed.name_zh,
      slug: toSlug(parsed.name),
      series: parsed.series,
      model_number: parsed.model_number,
      product_url: parsed.product_url || null,
      description: parsed.description,
      status: parsed.status,
      source_type: parsed.source_type,
      import_method: "admin",
    };

    let machineId = parsed.id;
    if (machineId) {
      const { error } = await supabase
        .from("equipment")
        .update(payload)
        .eq("id", machineId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("equipment")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed to create machine");
      machineId = data.id as string;
    }

    const aliases = [...new Set(
      parsed.aliases.split("\n").map((alias) => alias.trim()).filter(Boolean)
    )];
    const { error: deleteError } = await supabase
      .from("equipment_aliases")
      .delete()
      .eq("equipment_id", machineId);
    if (deleteError) throw new Error(deleteError.message);
    if (aliases.length > 0) {
      const { error: aliasError } = await supabase
        .from("equipment_aliases")
        .insert(aliases.map((alias) => ({ equipment_id: machineId, alias })));
      if (aliasError) throw new Error(aliasError.message);
    }
  });
}

export async function saveEquipmentType(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "type", async () => {
    const parsed = equipmentTypeSchema.parse({
      code: textValue(formData, "code"),
      name_en: textValue(formData, "name_en"),
      name_zh: textValue(formData, "name_zh"),
      category: textValue(formData, "category"),
      labels: formData.getAll("labels"),
    });
    const supabase = createAdminClient();
    const { code, ...payload } = parsed;
    // Updates never change the primary key or silently create a missing type.
    const result = textValue(formData, "mode") === "update"
      ? await supabase.from("equipment_types").update(payload).eq("code", code).select("code").single()
      : await supabase.from("equipment_types").insert(parsed).select("code").single();
    if (result.error) throw new Error(result.error.message);
  });
}

export async function deleteEquipmentType(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "type", async () => {
    const code = equipmentTypeCodeSchema.parse(textValue(formData, "code"));
    const supabase = createAdminClient();
    const { count, error } = await supabase.from("equipment")
      .select("id", { count: "exact", head: true }).eq("equipment_type_code", code);
    if (error) throw new Error(error.message);
    if (count !== 0) throw new Error("Type is still referenced by equipment");
    // The existing ON DELETE RESTRICT foreign key also protects against concurrent inserts.
    const result = await supabase.from("equipment_types").delete().eq("code", code).select("code").single();
    if (result.error) throw new Error(result.error.message);
  }, "delete");
}
