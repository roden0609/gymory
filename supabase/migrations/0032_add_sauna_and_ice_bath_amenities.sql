-- Add additional amenity fields.
-- Keep nullable semantics:
--   NULL = unknown, true/false = explicit value

alter table public.gyms
  add column if not exists has_dry_sauna boolean,
  add column if not exists has_wet_sauna boolean,
  add column if not exists has_ice_bath boolean;
