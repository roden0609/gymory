// Core Gym type — mirrors the Phase 1 gyms table in Supabase

export type SizeCategory = "small" | "medium" | "large";
export type DataSource = "admin" | "owner" | "user_submission" | "import";

export interface Gym {
  id: string;
  name: string;
  name_zh: string | null;
  slug: string;
  address: string | null;
  address_zh: string | null;
  district_code: string;
  country_code: string;
  postal_code: string | null;
  website_url: string | null;
  instagram_url: string | null;
  contact_phone: string | null;

  // Location
  lat: number | null;
  lng: number | null;

  // Gym meta
  size_category: SizeCategory | null;
  estimated_size_sqft: number | null;
  opening_hours_json: Record<string, string> | null;
  day_pass_price: number | null;
  is_active: boolean;
  is_verified: boolean;

  // Free weight / racks
  rack_count: number;
  bench_count: number;
  barbell_count: number;
  dumbbell_max_weight_kg: number | null;
  plate_min_weight_kg: number | null;
  plate_max_weight_kg: number | null;
  has_roman_chair: boolean;
  has_trap_bar: boolean;
  has_safety_squat_bar: boolean;
  has_farmer_handles: boolean;
  has_landmine_attachment: boolean;
  has_swiss_bar: boolean;
  has_cambered_bar: boolean;
  has_ez_bar: boolean;

  // Cardio
  treadmill_count: number;
  assault_bike_count: number;
  exercise_bike_count: number;
  climber_count: number;

  // HYROX
  assault_runner_count: number;
  ski_erg_count: number;
  rower_count: number;
  sled_count: number;
  has_wall_ball: boolean;
  wall_ball_count: number;
  wall_ball_4kg_count: number;
  wall_ball_6kg_count: number;
  wall_ball_9kg_count: number;
  wall_ball_plate_9ft_count: number;
  wall_ball_plate_10ft_count: number;
  has_sandbag: boolean;
  sandbag_10kg_count: number;
  sandbag_20kg_count: number;
  sandbag_30kg_count: number;
  has_kettlebell: boolean;
  kettlebell_16kg_count: number;
  kettlebell_24kg_count: number;
  kettlebell_32kg_count: number;

  // Cable
  cable_machine_count: number;
  has_lat_pulldown_cable: boolean;
  has_seated_row_cable: boolean;

  // Legacy machine counts kept for backwards-compatible reads
  lat_pulldown_count: number;
  chest_press_count: number;
  leg_press_count: number;
  hack_squat_count: number;

  // Full body machine
  smith_machine_count: number;

  // Legacy boolean equipment kept for backwards-compatible reads
  has_smith_machine: boolean;
  has_deadlift_platform: boolean;
  has_pull_up_bar: boolean;
  has_dip_station: boolean;
  has_trx: boolean;
  has_resistance_band: boolean;
  has_battle_ropes: boolean;
  has_rings: boolean;
  has_glute_ham_developer: boolean;
  has_reverse_hyper: boolean;
  has_farmers_handles: boolean;

  // Arm machine
  has_bicep_curl_machine: boolean;
  has_tricep_extension_machine: boolean;

  // Chest machine
  has_chest_press_machine: boolean;
  has_incline_chest_press_machine: boolean;
  has_iso_lateral_chest_press_machine: boolean;
  has_pec_deck_machine: boolean;
  has_chest_fly_machine: boolean;

  // Back machine
  has_lat_pulldown_machine: boolean;
  has_seated_row_machine: boolean;
  has_back_extension_machine: boolean;
  has_iso_lateral_row_machine: boolean;
  has_t_bar_row_machine: boolean;

  // Shoulder machine
  has_lateral_raise_machine: boolean;
  has_reverse_fly_machine: boolean;
  has_shoulder_press_machine: boolean;
  has_iso_lateral_shoulder_press_machine: boolean;

  // Leg machine
  has_hip_abductor_machine: boolean;
  has_hip_adductor_machine: boolean;
  has_leg_extension_machine: boolean;
  has_leg_press_machine: boolean;
  has_seated_leg_press_machine: boolean;
  has_lying_leg_curl_machine: boolean;
  has_seated_leg_curl_machine: boolean;
  has_seated_calf_raise_machine: boolean;
  has_squat_machine: boolean;
  has_standing_calf_raise_machine: boolean;

  // Other equipment
  has_battle_rope: boolean;
  has_foam_roller: boolean;
  has_medicine_ball: boolean;
  has_dip_belt: boolean;
  has_weight_vest: boolean;
  has_lifting_straps: boolean;
  has_plyo_box: boolean;
  has_balance_ball: boolean;

  equipment_notes: string | null;

  // Trust / freshness
  data_source: DataSource | null;
  equipment_last_verified_at: string | null;
  last_reported_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Lightweight version for list/search results
export type GymSummary = Pick<
  Gym,
  | "id"
  | "name"
  | "name_zh"
  | "slug"
  | "district_code"
  | "address"
  | "address_zh"
  | "lat"
  | "lng"
  | "size_category"
  | "rack_count"
  | "dumbbell_max_weight_kg"
  | "plate_min_weight_kg"
  | "plate_max_weight_kg"
  | "assault_bike_count"
  | "ski_erg_count"
  | "rower_count"
  | "sled_count"
  | "has_wall_ball"
  | "wall_ball_count"
  | "wall_ball_4kg_count"
  | "wall_ball_6kg_count"
  | "wall_ball_9kg_count"
  | "is_verified"
  | "equipment_last_verified_at"
>;
