import { z } from "zod";

const filterSchemas = {
  brand: z.string().uuid(),
  equipmentType: z.string().regex(/^[a-z][a-z0-9_]*$/).max(120),
  status: z.enum(["active", "discontinued", "unknown"]),
};

export type EquipmentFilters = { brand?: string; equipmentType?: string; status?: string };

export function parseEquipmentFilters(values: EquipmentFilters): EquipmentFilters {
  const filters: EquipmentFilters = {};
  for (const key of ["brand", "equipmentType", "status"] as const) {
    const parsed = filterSchemas[key].safeParse(values[key]);
    if (parsed.success) filters[key] = parsed.data;
  }
  return filters;
}

export function equipmentFilterConditions(filters: EquipmentFilters): [string, string][] {
  return Object.entries(filters).map(([key, value]) => [
    { brand: "brand_id", equipmentType: "equipment_type_code", status: "status" }[key as keyof EquipmentFilters], value,
  ]);
}
