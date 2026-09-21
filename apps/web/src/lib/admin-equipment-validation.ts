import { z } from "zod";

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

export const equipmentCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  name_zh: optionalText,
  parent_id: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
  sort_order: z.coerce.number().int().min(0).max(10000),
  is_active: z.boolean(),
});

export const equipmentMachineSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  category_id: z.string().uuid(),
  equipment_type_code: z.string().trim().nullable(),
  name: z.string().trim().min(1).max(200),
  series: optionalText,
  model_number: optionalText,
  product_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  description: optionalText,
  status: z.enum(["active", "discontinued", "unknown"]),
  source_type: z.enum(["official", "manual", "user_submitted"]),
  aliases: z.string(),
});

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
