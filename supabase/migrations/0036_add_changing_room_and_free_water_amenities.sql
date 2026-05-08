-- Add additional amenity fields.
-- Keep nullable semantics:
--   NULL = unknown, true/false = explicit value

alter table public.gyms
  add column if not exists has_changing_room boolean,
  add column if not exists has_free_water boolean;
