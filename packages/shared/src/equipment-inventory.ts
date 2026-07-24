import type { EquipmentInventoryPatchItem } from "./types/equipment";

type LegacyEquipmentValue = boolean | number | null | undefined;
type LegacyEquipmentValues = Record<string, LegacyEquipmentValue>;

const AMENITY_FIELDS = new Set([
  "has_washroom",
  "has_bathroom",
  "has_changing_room",
  "has_free_water",
  "has_dry_sauna",
  "has_wet_sauna",
  "has_ice_bath",
]);

const EQUIPMENT_CODE_OVERRIDES: Record<string, string> = {
  has_battle_rope: "battle_rope",
  has_battle_ropes: "battle_rope",
  has_farmer_handles: "farmer_handles",
  has_farmers_handles: "farmer_handles",
  lat_pulldown_count: "lat_pulldown_machine",
  chest_press_count: "chest_press_machine",
  leg_press_count: "leg_press_machine",
};

type ResolvedEquipmentValue = {
  isPresent: boolean;
  quantity: number | null;
};

export function isLegacyEquipmentField(field: string) {
  if (AMENITY_FIELDS.has(field)) return false;
  return field.startsWith("has_") || field.endsWith("_count");
}

export function legacyEquipmentFieldToCode(field: string) {
  if (!isLegacyEquipmentField(field)) return null;
  return (
    EQUIPMENT_CODE_OVERRIDES[field] ??
    (field.startsWith("has_") ? field.slice(4) : field.replace(/_count$/, ""))
  );
}

export function buildEquipmentInventoryPatch(
  values: LegacyEquipmentValues,
  previousValues?: LegacyEquipmentValues | null
): EquipmentInventoryPatchItem[] {
  const fieldsByCode = new Map<string, string[]>();

  for (const field of Object.keys(values)) {
    const code = legacyEquipmentFieldToCode(field);
    if (!code) continue;
    const fields = fieldsByCode.get(code) ?? [];
    fields.push(field);
    fieldsByCode.set(code, fields);
  }

  const patch: EquipmentInventoryPatchItem[] = [];

  for (const [equipmentCode, fields] of [...fieldsByCode].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const current = resolveEquipmentValue(values, fields);
    const previous = previousValues
      ? resolveEquipmentValue(previousValues, fields)
      : null;

    if (isSameResolvedValue(current, previous)) continue;

    if (!current) {
      if (previous) {
        patch.push({ equipmentCode, remove: true });
      }
      continue;
    }

    patch.push({
      equipmentCode,
      isPresent: current.isPresent,
      ...(current.quantity === null ? {} : { quantity: current.quantity }),
    });
  }

  return patch;
}

function resolveEquipmentValue(
  values: LegacyEquipmentValues,
  fields: string[]
): ResolvedEquipmentValue | null {
  let presenceSeen = false;
  let presenceTrue = false;
  let presenceFalse = false;
  let quantitySeen = false;
  let quantity: number | null = null;

  for (const field of fields) {
    const value = values[field];
    if (value === null || value === undefined) continue;

    if (field.startsWith("has_")) {
      if (typeof value !== "boolean") continue;
      presenceSeen = true;
      presenceTrue ||= value;
      presenceFalse ||= !value;
      continue;
    }

    if (field.endsWith("_count") && typeof value === "number") {
      if (!Number.isInteger(value) || value < 0) continue;
      quantitySeen = true;
      quantity = Math.max(quantity ?? 0, value);
    }
  }

  if (!presenceSeen && !quantitySeen) return null;

  if (quantity !== null && quantity > 0) {
    return { isPresent: true, quantity };
  }
  if (quantity === 0 && presenceTrue) {
    return { isPresent: true, quantity: null };
  }
  if (presenceTrue) {
    return { isPresent: true, quantity };
  }
  if (presenceFalse || quantity === 0) {
    return { isPresent: false, quantity };
  }

  return null;
}

function isSameResolvedValue(
  left: ResolvedEquipmentValue | null,
  right: ResolvedEquipmentValue | null
) {
  return (
    left?.isPresent === right?.isPresent &&
    left?.quantity === right?.quantity
  );
}
