import { z } from "zod";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_LABELS } from "@gymory/shared";
import { OFFICIAL_STATUSES } from "./equipment-image-review";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().nullable()
);

export const equipmentBrandSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().trim().min(1).max(120),
  name_zh: optionalText,
  country: optionalText,
  website_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  is_active: z.boolean(),
});

export const equipmentMachineSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  equipment_type_code: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  additional_type_codes: z.array(z.string().trim().max(120).regex(/^[a-z][a-z0-9_]*$/)).max(200).default([]).transform(codes => [...new Set(codes)]),
  labels: z.array(z.enum(EQUIPMENT_LABELS)).default([]).transform((labels) => [...new Set(labels)]),
  name: z.string().trim().min(1).max(200),
  name_zh: optionalText,
  series: optionalText,
  model_number: optionalText,
  product_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  description: optionalText,
  status: z.enum(["active", "discontinued", "unknown"]),
  source_type: z.enum(["official", "manual", "user_submitted"]),
  aliases: z.string(),
}).refine(data => !data.additional_type_codes.includes(data.equipment_type_code), { message: "Primary type cannot also be additional", path: ["additional_type_codes"] });

export const gymMachineInventorySchema = z.object({
  gym_id: z.string().uuid(),
  equipment_id: z.string().uuid(),
  quantity: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().positive().nullable()
  ),
  condition: z.enum(["good", "fair", "poor", "unknown"]),
  notes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(1000).nullable()
  ),
});

export const equipmentTypeCodeSchema = z.string().trim().max(120).regex(/^[a-z][a-z0-9_]*$/);

const optionalHttpUrl = z.string().trim().max(4000).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}, "Use an HTTP or HTTPS URL");
export const equipmentReviewIdentitySchema = z.object({
  id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
});
export const equipmentOfficialReviewSchema = equipmentReviewIdentitySchema.extend({
  official_name: z.string().trim().max(200), official_name_zh: z.string().trim().max(200).default(""),
  apply_official_names: z.boolean().default(false), official_model_number: z.string().trim().max(200),
  official_product_url: optionalHttpUrl, official_status: z.enum(OFFICIAL_STATUSES),
  official_review_note: z.string().trim().max(5000), verify: z.boolean(),
}).refine(value => !value.verify || value.official_name.length > 0, {message:"Official name required before verification",path:["official_name"]})
  .refine(value => !value.apply_official_names || value.verify, {message:"Confirm official data before applying display names",path:["apply_official_names"]});
export const equipmentReviewImageSchema = equipmentReviewIdentitySchema.extend({
  image_id: z.string().uuid().optional(), image_role: z.enum(["captured", "official"]),
  url: optionalHttpUrl.refine(value => value.length > 0), source_url: optionalHttpUrl,
});

export const equipmentTypeSchema = z.object({
  code: equipmentTypeCodeSchema,
  name_en: z.string().trim().min(1).max(120),
  name_zh: optionalText,
  category: z.string().refine((value) => EQUIPMENT_CATEGORIES.some(({ code }) => code === value)),
  labels: z.array(z.enum(EQUIPMENT_LABELS)).default([]).transform((labels) => [...new Set(labels)]),
});
