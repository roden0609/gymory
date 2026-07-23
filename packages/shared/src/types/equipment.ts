export type EquipmentType = {
  code: string;
  name_en: string;
  name_zh: string | null;
  category: string;
  parent_code: string | null;
  supports_quantity: boolean;
  aliases: string[];
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

export type GymEquipmentInventoryItem = {
  id: string;
  gym_id: string;
  equipment_code: string;
  is_present: boolean | null;
  quantity: number | null;
  created_at: string;
  updated_at: string;
  equipment_type?: EquipmentType;
};

export type EquipmentRequirement = {
  equipmentCode: string;
  isPresent?: true;
  minQuantity?: number;
  includeDescendants?: boolean;
};
