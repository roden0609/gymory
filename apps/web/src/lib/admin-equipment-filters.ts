import { z } from "zod";

const filterSchemas = {
  name: z.string().trim().min(1).max(200),
  model: z.string().trim().min(1).max(200),
  brand: z.string().uuid(),
  equipmentType: z.string().regex(/^[a-z][a-z0-9_]*$/).max(120),
  status: z.enum(["active", "discontinued", "unknown"]),
};

export type EquipmentFilters = { brand?: string; equipmentType?: string; status?: string; name?: string; model?: string };

export function parseEquipmentFilters(values: EquipmentFilters): EquipmentFilters {
  const filters: EquipmentFilters = {};
  for (const key of ["brand", "equipmentType", "status", "name", "model"] as const) {
    const parsed = filterSchemas[key].safeParse(values[key]);
    if (parsed.success) filters[key] = parsed.data;
  }
  return filters;
}

export function equipmentFilterConditions(filters: EquipmentFilters): [string, string][] {
  return Object.entries(filters).filter(([key]) => key !== "name" && key !== "model").map(([key, value]) => [
    { brand: "brand_id", equipmentType: "matching_types.equipment_type_code", status: "status" }[key as "brand" | "equipmentType" | "status"], value,
  ]);
}

// Quote PostgREST values and escape LIKE wildcards so input stays a literal substring.
export function equipmentTextFilterConditions(filters: EquipmentFilters): string[] {
  const pattern = (value: string) => JSON.stringify(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
  return [
    ...(filters.name ? [`name.ilike.${pattern(filters.name)},name_zh.ilike.${pattern(filters.name)}`] : []),
    ...(filters.model ? [`series.ilike.${pattern(filters.model)},model_number.ilike.${pattern(filters.model)}`] : []),
  ];
}
