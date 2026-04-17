-- Expand the single-table MVP equipment taxonomy while preserving old data.
-- The app now presents equipment by Free weight, Cardio, HYROX, and Machine.

alter table public.gyms
  add column if not exists plate_min_weight_kg numeric check (plate_min_weight_kg is null or plate_min_weight_kg > 0),

  -- Free weight
  add column if not exists has_roman_chair boolean not null default false,
  add column if not exists has_trap_bar boolean not null default false,
  add column if not exists has_safety_squat_bar boolean not null default false,
  add column if not exists has_farmer_handles boolean not null default false,

  -- Cardio
  add column if not exists exercise_bike_count integer not null default 0 check (exercise_bike_count >= 0),
  add column if not exists climber_count integer not null default 0 check (climber_count >= 0),

  -- HYROX
  add column if not exists assault_runner_count integer not null default 0 check (assault_runner_count >= 0),
  add column if not exists wall_ball_4kg_count integer not null default 0 check (wall_ball_4kg_count >= 0),
  add column if not exists wall_ball_6kg_count integer not null default 0 check (wall_ball_6kg_count >= 0),
  add column if not exists wall_ball_9kg_count integer not null default 0 check (wall_ball_9kg_count >= 0),
  add column if not exists wall_ball_plate_9ft_count integer not null default 0 check (wall_ball_plate_9ft_count >= 0),
  add column if not exists wall_ball_plate_10ft_count integer not null default 0 check (wall_ball_plate_10ft_count >= 0),

  -- Cable
  add column if not exists has_lat_pulldown_cable boolean not null default false,
  add column if not exists has_seated_row_cable boolean not null default false,

  -- Full body machine
  add column if not exists smith_machine_count integer not null default 0 check (smith_machine_count >= 0),

  -- Arm machine
  add column if not exists has_bicep_curl_machine boolean not null default false,
  add column if not exists has_tricep_extension_machine boolean not null default false,

  -- Chest machine
  add column if not exists has_chest_press_machine boolean not null default false,
  add column if not exists has_incline_chest_press_machine boolean not null default false,
  add column if not exists has_iso_lateral_chest_press_machine boolean not null default false,
  add column if not exists has_pec_deck_machine boolean not null default false,
  add column if not exists has_chest_fly_machine boolean not null default false,

  -- Back machine
  add column if not exists has_lat_pulldown_machine boolean not null default false,
  add column if not exists has_seated_row_machine boolean not null default false,
  add column if not exists has_back_extension_machine boolean not null default false,
  add column if not exists has_iso_lateral_row_machine boolean not null default false,
  add column if not exists has_t_bar_row_machine boolean not null default false,

  -- Shoulder machine
  add column if not exists has_lateral_raise_machine boolean not null default false,
  add column if not exists has_reverse_fly_machine boolean not null default false,
  add column if not exists has_shoulder_press_machine boolean not null default false,
  add column if not exists has_iso_lateral_shoulder_press_machine boolean not null default false,

  -- Leg machine
  add column if not exists has_hip_abductor_machine boolean not null default false,
  add column if not exists has_hip_adductor_machine boolean not null default false,
  add column if not exists has_leg_extension_machine boolean not null default false,
  add column if not exists has_leg_press_machine boolean not null default false,
  add column if not exists has_seated_leg_press_machine boolean not null default false,
  add column if not exists has_lying_leg_curl_machine boolean not null default false,
  add column if not exists has_seated_leg_curl_machine boolean not null default false,
  add column if not exists has_seated_calf_raise_machine boolean not null default false,
  add column if not exists has_squat_machine boolean not null default false,
  add column if not exists has_standing_calf_raise_machine boolean not null default false;

update public.gyms
set
  has_trap_bar = has_trap_bar or ('trap_bar' = any(equipment_tags)),
  has_safety_squat_bar = has_safety_squat_bar or ('safety_squat_bar' = any(equipment_tags)),
  has_farmer_handles = has_farmer_handles
    or has_farmers_handles
    or ('farmer_handles' = any(equipment_tags)),
  wall_ball_9kg_count = greatest(wall_ball_9kg_count, wall_ball_count),
  smith_machine_count = greatest(smith_machine_count, case when has_smith_machine then 1 else 0 end),
  has_lat_pulldown_machine = has_lat_pulldown_machine or lat_pulldown_count > 0,
  has_chest_press_machine = has_chest_press_machine or chest_press_count > 0,
  has_leg_press_machine = has_leg_press_machine or leg_press_count > 0,
  has_squat_machine = has_squat_machine or hack_squat_count > 0;

create index if not exists idx_gyms_assault_runner_count
  on public.gyms (assault_runner_count);

create index if not exists idx_gyms_wall_ball_9kg_count
  on public.gyms (wall_ball_9kg_count);

create index if not exists idx_gyms_cable_machine_count
  on public.gyms (cable_machine_count);

create index if not exists idx_gyms_smith_machine_count
  on public.gyms (smith_machine_count);
