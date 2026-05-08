-- Add additional machine equipment fields.
-- Keep nullable semantics:
--   NULL = unknown, true/false = explicit value

alter table public.gyms
  add column if not exists has_decline_chest_press_machine boolean,
  add column if not exists has_bench_rack boolean,
  add column if not exists has_incline_bench_rack boolean,
  add column if not exists has_dip_machine boolean,
  add column if not exists has_pull_over_machine boolean,
  add column if not exists has_belt_squat_machine boolean,
  add column if not exists has_standing_lateral_raise_machine boolean;
