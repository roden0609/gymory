import { z } from "zod";

const equipmentFilterKeys = ["brand", "equipmentType", "status", "name", "model", "verification"] as const;

const filterSchemas = {
  name: z.string().trim().min(1).max(200),
  model: z.string().trim().min(1).max(200),
  brand: z.string().uuid(),
  equipmentType: z.string().regex(/^[a-z][a-z0-9_]*$/).max(120),
  verification: z.enum(["verified", "unverified"]),
  status: z.enum(["active", "discontinued", "unknown"]),
};

export type EquipmentFilters = Partial<Record<(typeof equipmentFilterKeys)[number], string>>;

export function parseEquipmentFilters(values: EquipmentFilters): EquipmentFilters {
  const filters: EquipmentFilters = {};
  for (const key of equipmentFilterKeys) {
    const parsed = filterSchemas[key].safeParse(values[key]);
    if (parsed.success) filters[key] = parsed.data;
  }
  return filters;
}

export function equipmentFilterConditions(filters: EquipmentFilters): [string, string][] {
  const columns = { brand: "brand_id", equipmentType: "matching_types.equipment_type_code", status: "status" } as const;
  const conditions: [string, string][] = [];
  for (const key of ["brand", "equipmentType", "status"] as const) {
    const value = filters[key];
    if (value) conditions.push([columns[key], value]);
  }
  return conditions;
}

// Quote PostgREST values and escape LIKE wildcards so input stays a literal substring.
export function equipmentTextFilterConditions(filters: EquipmentFilters): string[] {
  const pattern = (value: string) => JSON.stringify(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
  return [
    ...(filters.name ? [`name.ilike.${pattern(filters.name)},name_zh.ilike.${pattern(filters.name)}`] : []),
    ...(filters.model ? [`series.ilike.${pattern(filters.model)},model_number.ilike.${pattern(filters.model)}`] : []),
  ];
}
