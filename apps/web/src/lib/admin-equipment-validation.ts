import { z } from "zod";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_LABELS } from "@gymory/shared";

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

export const equipmentTypeSchema = z.object({
  code: equipmentTypeCodeSchema,
  name_en: z.string().trim().min(1).max(120),
  name_zh: optionalText,
  category: z.string().refine((value) => EQUIPMENT_CATEGORIES.some(({ code }) => code === value)),
  labels: z.array(z.enum(EQUIPMENT_LABELS)).default([]).transform((labels) => [...new Set(labels)]),
});
