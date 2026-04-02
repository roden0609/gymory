// Flexible equipment tags — used in the equipment_tags text[] column
// These are items that don't warrant their own column but are worth recording
export const EQUIPMENT_TAGS = [
  "trap_bar",
  "safety_squat_bar",
  "cambered_bar",
  "swiss_bar",
  "dip_belt",
  "lifting_straps",
  "weight_vest",
  "peg_board",
  "rope_climb",
  "landmine",
  "t_bar_row",
  "reverse_hyper",
  "glute_ham_developer",
  "farmer_handles",
  "yoke",
  "atlas_stones",
  "kettlebells",
  "medicine_balls",
  "plyo_boxes",
  "foam_rollers",
  "hyperextension_bench",
  "preacher_curl_bench",
  "seated_calf_raise",
] as const;

export type EquipmentTag = (typeof EQUIPMENT_TAGS)[number];
