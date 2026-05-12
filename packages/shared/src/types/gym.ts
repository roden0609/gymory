// Core Gym type — mirrors the Phase 1 gyms table in Supabase

export type SizeCategory = "small" | "medium" | "large";
export type DataSource = "admin" | "owner" | "user_submission" | "import";
export type DataAccuracyStatus = "normal" | "needs_review";

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
  rack_count: number | null;
  bench_count: number | null;
  barbell_count: number | null;
  platform_count: number | null;
  dumbbell_min_weight_kg: number | null;
  dumbbell_max_weight_kg: number | null;
  plate_min_weight_kg: number | null;
  plate_max_weight_kg: number | null;
  has_roman_chair: boolean | null;
  has_trap_bar: boolean | null;
  has_safety_squat_bar: boolean | null;
  has_farmer_handles: boolean | null;
  has_landmine_attachment: boolean | null;
  has_swiss_bar: boolean | null;
  has_cambered_bar: boolean | null;
  has_ez_bar: boolean | null;

  // Cardio
  treadmill_count: number | null;
  assault_bike_count: number | null;
  exercise_bike_count: number | null;
  climber_count: number | null;
  elliptical_machine_count: number | null;

  // HYROX
  assault_runner_count: number | null;
  ski_erg_count: number | null;
  rower_count: number | null;
  sled_count: number | null;
  has_wall_ball: boolean | null;
  wall_ball_count: number | null;
  wall_ball_4kg_count: number | null;
  wall_ball_6kg_count: number | null;
  wall_ball_8kg_count: number | null;
  wall_ball_9kg_count: number | null;
  wall_ball_10kg_count: number | null;
  wall_ball_plate_9ft_count: number | null;
  wall_ball_plate_10ft_count: number | null;
  has_workout_sandbag: boolean | null;
  has_boxing_sandbag: boolean | null;
  sandbag_5kg_count: number | null;
  sandbag_10kg_count: number | null;
  sandbag_15kg_count: number | null;
  sandbag_20kg_count: number | null;
  sandbag_25kg_count: number | null;
  sandbag_30kg_count: number | null;
  has_kettlebell: boolean | null;
  kettlebell_4kg_count: number | null;
  kettlebell_6kg_count: number | null;
  kettlebell_8kg_count: number | null;
  kettlebell_10kg_count: number | null;
  kettlebell_12kg_count: number | null;
  kettlebell_14kg_count: number | null;
  kettlebell_16kg_count: number | null;
  kettlebell_18kg_count: number | null;
  kettlebell_20kg_count: number | null;
  kettlebell_24kg_count: number | null;
  kettlebell_32kg_count: number | null;

  // Cable
  cable_machine_count: number | null;
  has_lat_pulldown_cable: boolean | null;
  has_seated_row_cable: boolean | null;

  // Legacy machine counts kept for backwards-compatible reads
  lat_pulldown_count: number | null;
  chest_press_count: number | null;
  leg_press_count: number | null;

  // Full body machine
  smith_machine_count: number | null;

  // Legacy boolean equipment kept for backwards-compatible reads
  has_smith_machine: boolean | null;
  has_deadlift_platform: boolean | null;
  has_pull_up_bar: boolean | null;
  has_dip_station: boolean | null;
  has_trx: boolean | null;
  has_resistance_band: boolean | null;
  has_battle_ropes: boolean | null;
  has_rings: boolean | null;
  has_glute_ham_developer: boolean | null;
  has_reverse_hyper: boolean | null;
  has_farmers_handles: boolean | null;

  // Arm machine
  has_preacher_curl_bench: boolean | null;
  has_bicep_curl_machine: boolean | null;
  has_tricep_extension_machine: boolean | null;
  has_dip_machine: boolean | null;

  // Chest machine
  has_chest_press_machine: boolean | null;
  has_incline_chest_press_machine: boolean | null;
  has_decline_chest_press_machine: boolean | null;
  has_bench_rack: boolean | null;
  has_incline_bench_rack: boolean | null;
  has_iso_lateral_chest_press_machine: boolean | null;
  has_pec_deck_machine: boolean | null;
  has_chest_fly_machine: boolean | null;

  // Back machine
  has_lat_pulldown_machine: boolean | null;
  has_seated_row_machine: boolean | null;
  has_back_extension_machine: boolean | null;
  has_iso_lateral_row_machine: boolean | null;
  has_t_bar_row_machine: boolean | null;
  has_pull_over_machine: boolean | null;

  // Shoulder machine
  has_overhead_chair: boolean | null;
  has_lateral_raise_machine: boolean | null;
  has_standing_lateral_raise_machine: boolean | null;
  has_reverse_fly_machine: boolean | null;
  has_shoulder_press_machine: boolean | null;
  has_iso_lateral_shoulder_press_machine: boolean | null;
  has_multi_press_machine: boolean | null;
  has_multi_hip_machine: boolean | null;
  has_stretching_machine: boolean | null;
  has_mobility_stick: boolean | null;

  // Leg machine
  has_hip_abductor_machine: boolean | null;
  has_hip_adductor_machine: boolean | null;
  has_leg_extension_machine: boolean | null;
  has_leg_press_machine: boolean | null;
  has_seated_leg_press_machine: boolean | null;
  has_lying_leg_curl_machine: boolean | null;
  has_seated_leg_curl_machine: boolean | null;
  has_seated_calf_raise_machine: boolean | null;
  has_squat_machine: boolean | null;
  has_hack_squat: boolean | null;
  has_belt_squat_machine: boolean | null;
  has_standing_calf_raise_machine: boolean | null;
  has_glute_extension_machine: boolean | null;
  has_hip_thrust_machine: boolean | null;

  // Other equipment
  has_battle_rope: boolean | null;
  has_foam_roller: boolean | null;
  has_medicine_ball: boolean | null;
  has_exercise_stepper: boolean | null;
  has_ab_roller: boolean | null;
  has_massage_ball: boolean | null;
  has_dip_belt: boolean | null;
  has_weight_vest: boolean | null;
  has_lifting_straps: boolean | null;
  has_plyo_box: boolean | null;
  has_balance_ball: boolean | null;
  has_washroom: boolean | null;
  has_bathroom: boolean | null;
  has_changing_room: boolean | null;
  has_free_water: boolean | null;
  has_dry_sauna: boolean | null;
  has_wet_sauna: boolean | null;
  has_ice_bath: boolean | null;
  has_yoga_block: boolean | null;
  has_yoga_mat: boolean | null;

  // Core machine
  has_ab_crunch_bench: boolean | null;
  has_torso_rotation_machine: boolean | null;
  has_ab_crunch_machine: boolean | null;

  equipment_notes: string | null;

  // Trust / freshness
  data_source: DataSource | null;
  data_accuracy_status: DataAccuracyStatus;
  data_accuracy_flagged_at: string | null;
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
  | "bench_count"
  | "barbell_count"
  | "platform_count"
  | "dumbbell_min_weight_kg"
  | "dumbbell_max_weight_kg"
  | "plate_min_weight_kg"
  | "plate_max_weight_kg"
  | "has_roman_chair"
  | "has_trap_bar"
  | "has_safety_squat_bar"
  | "has_farmer_handles"
  | "has_landmine_attachment"
  | "has_swiss_bar"
  | "has_cambered_bar"
  | "has_ez_bar"
  | "treadmill_count"
  | "assault_bike_count"
  | "exercise_bike_count"
  | "climber_count"
  | "elliptical_machine_count"
  | "assault_runner_count"
  | "ski_erg_count"
  | "rower_count"
  | "sled_count"
  | "has_wall_ball"
  | "wall_ball_count"
  | "wall_ball_4kg_count"
  | "wall_ball_6kg_count"
  | "wall_ball_8kg_count"
  | "wall_ball_9kg_count"
  | "wall_ball_10kg_count"
  | "wall_ball_plate_9ft_count"
  | "wall_ball_plate_10ft_count"
  | "has_workout_sandbag"
  | "has_boxing_sandbag"
  | "sandbag_5kg_count"
  | "sandbag_10kg_count"
  | "sandbag_15kg_count"
  | "sandbag_20kg_count"
  | "sandbag_25kg_count"
  | "sandbag_30kg_count"
  | "has_kettlebell"
  | "kettlebell_4kg_count"
  | "kettlebell_6kg_count"
  | "kettlebell_8kg_count"
  | "kettlebell_10kg_count"
  | "kettlebell_12kg_count"
  | "kettlebell_14kg_count"
  | "kettlebell_16kg_count"
  | "kettlebell_18kg_count"
  | "kettlebell_20kg_count"
  | "kettlebell_24kg_count"
  | "kettlebell_32kg_count"
  | "cable_machine_count"
  | "has_lat_pulldown_cable"
  | "has_seated_row_cable"
  | "smith_machine_count"
  | "has_smith_machine"
  | "has_deadlift_platform"
  | "has_pull_up_bar"
  | "has_dip_station"
  | "has_trx"
  | "has_resistance_band"
  | "has_battle_ropes"
  | "has_rings"
  | "has_glute_ham_developer"
  | "has_reverse_hyper"
  | "has_farmers_handles"
  | "has_preacher_curl_bench"
  | "has_bicep_curl_machine"
  | "has_tricep_extension_machine"
  | "has_dip_machine"
  | "has_chest_press_machine"
  | "has_incline_chest_press_machine"
  | "has_decline_chest_press_machine"
  | "has_bench_rack"
  | "has_incline_bench_rack"
  | "has_iso_lateral_chest_press_machine"
  | "has_pec_deck_machine"
  | "has_chest_fly_machine"
  | "has_lat_pulldown_machine"
  | "has_seated_row_machine"
  | "has_back_extension_machine"
  | "has_iso_lateral_row_machine"
  | "has_t_bar_row_machine"
  | "has_pull_over_machine"
  | "has_overhead_chair"
  | "has_lateral_raise_machine"
  | "has_standing_lateral_raise_machine"
  | "has_reverse_fly_machine"
  | "has_shoulder_press_machine"
  | "has_iso_lateral_shoulder_press_machine"
  | "has_multi_press_machine"
  | "has_multi_hip_machine"
  | "has_stretching_machine"
  | "has_mobility_stick"
  | "has_hip_abductor_machine"
  | "has_hip_adductor_machine"
  | "has_leg_extension_machine"
  | "has_leg_press_machine"
  | "has_seated_leg_press_machine"
  | "has_lying_leg_curl_machine"
  | "has_seated_leg_curl_machine"
  | "has_seated_calf_raise_machine"
  | "has_squat_machine"
  | "has_hack_squat"
  | "has_belt_squat_machine"
  | "has_standing_calf_raise_machine"
  | "has_glute_extension_machine"
  | "has_hip_thrust_machine"
  | "has_battle_rope"
  | "has_foam_roller"
  | "has_medicine_ball"
  | "has_exercise_stepper"
  | "has_ab_roller"
  | "has_massage_ball"
  | "has_dip_belt"
  | "has_weight_vest"
  | "has_lifting_straps"
  | "has_plyo_box"
  | "has_balance_ball"
  | "has_washroom"
  | "has_bathroom"
  | "has_changing_room"
  | "has_free_water"
  | "has_dry_sauna"
  | "has_wet_sauna"
  | "has_ice_bath"
  | "has_yoga_block"
  | "has_yoga_mat"
  | "has_ab_crunch_bench"
  | "has_torso_rotation_machine"
  | "has_ab_crunch_machine"
  | "equipment_notes"
  | "is_verified"
  | "data_accuracy_status"
  | "equipment_last_verified_at"
  | "updated_at"
> & {
  accuracy_like_count?: number;
  accuracy_dislike_count?: number;
  accuracy_total_votes?: number;
};
