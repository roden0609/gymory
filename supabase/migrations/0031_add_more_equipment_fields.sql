-- Add additional equipment fields for HYROX, other equipment, leg machines,
-- and core machines.
-- Keep nullable semantics:
--   count columns: NULL = unknown, integer >= 0 = known count
--   boolean columns: NULL = unknown, true/false = explicit value

alter table public.gyms
  add column if not exists wall_ball_8kg_count integer
    check (wall_ball_8kg_count is null or wall_ball_8kg_count >= 0),

  add column if not exists has_exercise_stepper boolean,
  add column if not exists has_ab_roller boolean,
  add column if not exists has_massage_ball boolean,

  add column if not exists has_glute_extension_machine boolean,
  add column if not exists has_hip_thrust_machine boolean,
  add column if not exists has_booty_builder boolean,

  add column if not exists has_torso_rotation_machine boolean,
  add column if not exists has_ab_crunch_machine boolean;
