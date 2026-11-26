"use server";

import { parseEquipmentFilters } from "@/lib/admin-equipment-filters";
import { PUBLIC_CATALOG_TAG, PUBLIC_GYM_OVERVIEW_TAG } from "@/lib/public-search-cache";
import { revalidatePath, revalidateTag } from "next/cache";
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
  equipmentLabelsSchema,
  equipmentOfficialReviewSchema,
  equipmentReviewIdentitySchema,
  equipmentCapturedNamesSchema,
  equipmentReviewImageSchema,
} from "@/lib/admin-equipment-validation";
import { EQUIPMENT_IMAGE_BUCKET, equipmentImageFileType } from "@/lib/equipment-image-review";
import { randomUUID } from "node:crypto";

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

async function authorize(locale: string) {
  return await requireAdminSession(
    `/${locale}/login?next=/${locale}/admin/equipment`,
    `/${locale}`
  );
}

function refreshCatalog() {
  revalidateTag(PUBLIC_CATALOG_TAG);
  revalidateTag(PUBLIC_GYM_OVERVIEW_TAG);
  for (const locale of ["en", "zh-HK"]) {
    for (const page of ["equipment", "brands", "equipment-types"]) {
      revalidatePath(`/${locale}/admin/${page}`);
    }
  }
  revalidatePath("/[locale]/gyms/[slug]", "page");
  revalidatePath("/[locale]/gyms/[slug]/[equipment]", "page");
  revalidatePath("/[locale]/search", "page");
  revalidatePath("/[locale]/equipment/[equipment]", "page");
}

type CatalogEntity = "brand" | "machine" | "type" | "image";

async function runCatalogSave(
  locale: string,
  entity: CatalogEntity,
  operation: () => Promise<void>,
  formData: FormData,
  action = "save"
) {
  const page = entity === "brand" ? "brands" : entity === "type" ? "equipment-types" : "equipment";
  const context = new URLSearchParams();
  const requestedPage = Number(textValue(formData, "catalog_page"));
  if (Number.isSafeInteger(requestedPage) && requestedPage > 1) context.set("page", String(requestedPage));
  const category = textValue(formData, "catalog_category");
  if (entity === "type" && equipmentTypeSchema.shape.category.safeParse(category).success) context.set("category", category);
  if (entity === "machine" || entity === "image") {
    const filters = parseEquipmentFilters({ name: textValue(formData, "catalog_name"), model: textValue(formData, "catalog_model"), brand: textValue(formData, "catalog_brand"), equipmentType: textValue(formData, "catalog_equipmentType"), status: textValue(formData, "catalog_status"), verification: textValue(formData, "catalog_verification") });
    for (const [key, value] of Object.entries(filters)) context.set(key, value);
  }
  const contextQuery = context.size ? `&${context}` : "";
  try {
    await operation();
    refreshCatalog();
  } catch (error) {
    const reason = getFailureReason(error);
    redirect(
      `/${locale}/admin/${page}?result=error&entity=${entity}&reason=${reason}&action=${action}${contextQuery}`
    );
  }

  redirect(`/${locale}/admin/${page}?result=success&entity=${entity}&action=${action}${contextQuery}`);
}

function getFailureReason(error: unknown) {
  if (error instanceof z.ZodError) return "invalid";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("check constraint")) return "invalid";
  if (message === "image storage cleanup failed") return "storageCleanup";
  if (message.includes("stale")) return "stale";
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
  }, formData);
}

async function persistMachine(formData: FormData) {
  const parsed = equipmentMachineSchema.parse({
    id: textValue(formData, "id") || undefined,
    brand_id: textValue(formData, "brand_id"),
    equipment_type_code: textValue(formData, "equipment_type_code"),
    additional_type_codes: formData.getAll("additional_type_codes"),
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
  const captured = parsed.id && (formData.has("captured_name") || formData.has("captured_name_zh"))
    ? equipmentCapturedNamesSchema.parse({
        id: parsed.id,
        expected_updated_at: formData.get("expected_updated_at"),
        captured_name: formData.get("captured_name"),
        captured_name_zh: formData.get("captured_name_zh"),
      })
    : undefined;
  const supabase = createAdminClient();
  const payload = {
    brand_id: parsed.brand_id,
    primary_type_code: parsed.equipment_type_code,
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
    ...(captured && {
      captured_name: captured.captured_name,
      captured_name_zh: captured.captured_name_zh,
      expected_updated_at: captured.expected_updated_at,
    }),
  };

  const aliases = [...new Set(parsed.aliases.split("\n").map(alias => alias.trim()).filter(Boolean))];
  const { error } = await supabase.rpc("save_equipment_catalog_machine", {
    p_id: parsed.id ?? null,
    p_machine: payload,
    p_additional_codes: parsed.additional_type_codes,
    p_aliases: aliases,
  });
  if (error) throw new Error(error.message);
}

export async function saveMachine(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "machine", () => persistMachine(formData), formData);
}

export async function saveMachineQuickFields(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  const actor = await authorize(locale);
  try {
    const { id, expected_updated_at } = equipmentReviewIdentitySchema.parse({
      id: formData.get("id"),
      expected_updated_at: formData.get("expected_updated_at"),
    });
    const labels = equipmentLabelsSchema.parse(formData.getAll("labels"));
    const verify = checked(formData, "verify");
    const supabase = createAdminClient();
    const { data: current, error: readError } = await supabase.from("equipment")
      .select("official_name, official_verified_at")
      .eq("id", id)
      .eq("updated_at", expected_updated_at)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Stale equipment record");

    const wasVerified = current.official_verified_at !== null;
    if (verify && !wasVerified) {
      z.string().trim().min(1).parse(current.official_name);
    }
    const verification = verify === wasVerified ? {} : {
      official_verified_at: verify ? new Date().toISOString() : null,
      official_verified_by: verify ? z.string().trim().min(1).parse(actor.uid) : null,
    };

    const { data: updated, error: updateError } = await supabase.from("equipment")
      .update({ labels, ...verification })
      .eq("id", id)
      .eq("updated_at", expected_updated_at)
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error("Stale equipment record");
    refreshCatalog();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, reason: getFailureReason(error) };
  }
}

async function persistOfficialReview(formData: FormData, actorUid: string) {
  const parsed = equipmentOfficialReviewSchema.parse({
    id: textValue(formData,"id"), expected_updated_at:textValue(formData,"expected_updated_at"),
    official_name:textValue(formData,"official_name"), official_name_zh:textValue(formData,"official_name_zh"),
    official_model_number:textValue(formData,"official_model_number"),
    official_product_url:textValue(formData,"official_product_url"), official_status:textValue(formData,"official_status"),
    official_review_note:textValue(formData,"official_review_note"), verify:checked(formData,"verify"),
  });
  const { error } = await createAdminClient().rpc("save_equipment_official_review", {
    p_id:parsed.id, p_expected_updated_at:parsed.expected_updated_at,
    p_name:parsed.official_name,p_model:parsed.official_model_number,p_product_url:parsed.official_product_url,
    p_status:parsed.official_status,p_note:parsed.official_review_note,p_verify:parsed.verify,p_actor:actorUid,
    p_name_zh:parsed.official_name_zh,
  });
  if(error) throw new Error(error.message);
}

export async function saveOfficialReview(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  const actor = await authorize(locale);
  await runCatalogSave(locale, "machine", () => persistOfficialReview(formData, actor.uid), formData);
}

export async function saveEquipmentEditor(section: "equipment" | "review", formData: FormData) {
  const actor = await authorize(textValue(formData, "locale") || "en");
  try {
    if (section === "equipment") await persistMachine(formData);
    else if (section === "review") await persistOfficialReview(formData, actor.uid);
    else return { ok: false as const, reason: "invalid" };
    refreshCatalog();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, reason: getFailureReason(error) };
  }
}

export async function saveReviewImage(formData: FormData) {
  const locale=textValue(formData,"locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale,"machine",async()=>{
    const parsed=equipmentReviewImageSchema.parse({id:textValue(formData,"id"),expected_updated_at:textValue(formData,"expected_updated_at"),
      image_id:textValue(formData,"image_id") || undefined,image_role:textValue(formData,"image_role"),url:textValue(formData,"url"),source_url:textValue(formData,"source_url")});
    const {error}=await createAdminClient().rpc("save_equipment_review_image",{p_id:parsed.id,p_expected_updated_at:parsed.expected_updated_at,
      p_image_id:parsed.image_id ?? null,p_role:parsed.image_role,p_url:parsed.url,p_source_url:parsed.source_url});
    if(error) throw new Error(error.message);
  },formData);
}

export async function selectReviewImage(formData: FormData) {
  const locale=textValue(formData,"locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale,"machine",async()=>{
    const id=z.string().uuid().parse(textValue(formData,"id"));
    const imageId=z.string().uuid().parse(textValue(formData,"image_id"));
    const expectedUrl=z.string().url().parse(textValue(formData,"expected_url"));
    const supabase=createAdminClient();
    const {data:image,error:readError}=await supabase.from("equipment_images").select("url, storage_path")
      .eq("equipment_id",id).eq("id",imageId).single();
    if(readError || !image) throw new Error(readError?.message || "Image not found");
    if(image.url!==expectedUrl) throw new Error("Stale image URL");
    const file=formData.get("image_file");
    let uploadedPath:string | null=null;
    if(file && typeof file!=="string" && file.size>0) {
      if(file.size>5*1024*1024) throw new z.ZodError([{code:"custom",path:["image_file"],message:"Maximum image size is 5 MB"}]);
      const bytes=new Uint8Array(await file.arrayBuffer());
      const extension=equipmentImageFileType(bytes);
      if(!extension) throw new z.ZodError([{code:"custom",path:["image_file"],message:"Upload JPEG, PNG or WebP"}]);
      uploadedPath=`${id}/${imageId}/${randomUUID()}.${extension}`;
      const {error}=await supabase.storage.from(EQUIPMENT_IMAGE_BUCKET).upload(uploadedPath,bytes,
        {contentType:extension==="jpg"?"image/jpeg":`image/${extension}`,upsert:false});
      if(error) throw new Error(error.message);
    } else if(!image.storage_path) {
      throw new z.ZodError([{code:"custom",path:["image_file"],message:"Upload an image first"}]);
    }
    try {
      const {error}=await supabase.rpc("select_equipment_primary_image",{p_id:id,p_image_id:imageId,p_expected_url:expectedUrl,p_storage_path:uploadedPath});
      if(error) throw new Error(error.message);
    } catch(error) {
      if(uploadedPath) await supabase.storage.from(EQUIPMENT_IMAGE_BUCKET).remove([uploadedPath]);
      throw error;
    }
  },formData);
}

export async function deleteEquipmentImage(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "image", async () => {
    const parseUuid = z.string().uuid();
    const parseRevision = z.string().datetime({ offset: true });
    const id = parseUuid.parse(formData.get("id"));
    const imageId = parseUuid.parse(formData.get("image_id"));
    const revision = parseRevision.parse(formData.get("expected_updated_at"));
    const isPrivate = z.enum(["review", "private"]).parse(formData.get("image_kind")) === "private";
    const supabase = createAdminClient();
    const { data: path, error } = await supabase.rpc("delete_equipment_image", {
      p_id: id,
      p_image_id: imageId,
      p_expected_updated_at: revision,
      p_private: isPrivate,
      p_image_updated_at: isPrivate ? null : parseRevision.parse(formData.get("image_updated_at")),
      p_expected_display_id: parseUuid.nullable().parse(formData.get("display_id") || null),
      p_expected_next_display_id: parseUuid.nullable().parse(formData.get("next_display_id") || null),
    });
    if (error) throw new Error(error.message);
    if (!path) return;

    const table = isPrivate ? "equipment_captured_images" : "equipment_images";
    const { count, error: referenceError } = await supabase.from(table)
      .select("id", { count: "exact", head: true }).eq("storage_path", path);
    if (!referenceError && count !== null && count > 0) return;
    if (!referenceError && count === 0) {
      const bucket = isPrivate ? "equipment-captured-images" : EQUIPMENT_IMAGE_BUCKET;
      const { error: cleanupError } = await supabase.storage.from(bucket).remove([path]);
      if (!cleanupError) return;
    }
    refreshCatalog();
    throw new Error("Image Storage cleanup failed");
  }, formData, "delete");
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
  }, formData);
}

export async function deleteEquipmentType(formData: FormData) {
  const locale = textValue(formData, "locale") || "en";
  await authorize(locale);
  await runCatalogSave(locale, "type", async () => {
    const code = equipmentTypeCodeSchema.parse(textValue(formData, "code"));
    const supabase = createAdminClient();
    const { count, error } = await supabase.from("equipment_type_assignments")
      .select("equipment_id", { count: "exact", head: true }).eq("equipment_type_code", code);
    if (error) throw new Error(error.message);
    if (count !== 0) throw new Error("Type is still referenced by equipment");
    // The existing ON DELETE RESTRICT foreign key also protects against concurrent inserts.
    const result = await supabase.from("equipment_types").delete().eq("code", code).select("code").single();
    if (result.error) throw new Error(result.error.message);
  }, formData, "delete");
}
