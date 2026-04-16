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
  plate_max_weight_kg: number | null;

  // Cardio / conditioning counts
  assault_bike_count: number;
  ski_erg_count: number;
  rower_count: number;
  sled_count: number;
  treadmill_count: number;

  // Strength machine counts
  cable_machine_count: number;
  lat_pulldown_count: number;
  chest_press_count: number;
  leg_press_count: number;
  hack_squat_count: number;

  // Boolean equipment
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

  // Flexible
  equipment_tags: string[];
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
  | "assault_bike_count"
  | "ski_erg_count"
  | "rower_count"
  | "is_verified"
  | "equipment_last_verified_at"
>;
