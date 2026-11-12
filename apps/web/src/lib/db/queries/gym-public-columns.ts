import type { Gym } from "@gymory/shared";

// Public detail display, contact links and structured SEO data only.
export const GYM_DETAIL_FIELDS = [
  "id",
  "name",
  "name_zh",
  "slug",
  "district_code",
  "address",
  "address_zh",
  "lat",
  "lng",
  "country_code",
  "postal_code",
  "size_category",
  "estimated_size_sqft",
  "dumbbell_min_weight_kg",
  "dumbbell_max_weight_kg",
  "plate_min_weight_kg",
  "plate_max_weight_kg",
  "has_washroom",
  "has_bathroom",
  "has_changing_room",
  "has_free_water",
  "has_dry_sauna",
  "has_wet_sauna",
  "has_ice_bath",
  "day_pass_price",
  "opening_hours_json",
  "website_url",
  "instagram_url",
  "contact_phone",
  "is_verified",
  "is_hyrox_official",
  "equipment_last_verified_at",
  "updated_at",
] as const satisfies readonly (keyof Gym)[];

export const GYM_DETAIL_COLUMNS = GYM_DETAIL_FIELDS.join(", ");
export type PublicGymDetail = Pick<Gym, (typeof GYM_DETAIL_FIELDS)[number]>;
