-- Sample seed data — 5 Hong Kong gyms for local dev / testing
-- Run after all migrations

insert into gyms (
  name, name_zh, slug, address, address_zh, district_code, country_code, postal_code,
  lat, lng,
  size_category, estimated_size_sqft,
  day_pass_price, is_active, is_verified,

  -- Free weight
  rack_count, bench_count, barbell_count, platform_count,
  dumbbell_max_weight_kg, plate_min_weight_kg, plate_max_weight_kg,
  has_roman_chair, has_dip_station, has_pull_up_bar, has_reverse_hyper,
  has_trap_bar, has_safety_squat_bar, has_farmer_handles,
  has_landmine_attachment, has_swiss_bar, has_cambered_bar, has_ez_bar,

  -- Cardio
  treadmill_count, assault_bike_count, exercise_bike_count, climber_count,

  -- HYROX
  assault_runner_count, ski_erg_count, rower_count, sled_count,
  has_wall_ball, wall_ball_4kg_count, wall_ball_6kg_count, wall_ball_9kg_count,
  wall_ball_plate_9ft_count, wall_ball_plate_10ft_count,
  has_sandbag, sandbag_10kg_count, sandbag_20kg_count, sandbag_30kg_count,
  has_kettlebell, kettlebell_16kg_count, kettlebell_24kg_count, kettlebell_32kg_count,

  -- Cable
  cable_machine_count, has_lat_pulldown_cable, has_seated_row_cable,

  -- Full body / machine groups
  smith_machine_count,
  has_bicep_curl_machine, has_tricep_extension_machine,
  has_chest_press_machine, has_incline_chest_press_machine,
  has_iso_lateral_chest_press_machine, has_pec_deck_machine, has_chest_fly_machine,
  has_lat_pulldown_machine, has_seated_row_machine, has_back_extension_machine,
  has_iso_lateral_row_machine, has_t_bar_row_machine,
  has_lateral_raise_machine, has_reverse_fly_machine, has_shoulder_press_machine,
  has_iso_lateral_shoulder_press_machine,
  has_hip_abductor_machine, has_hip_adductor_machine, has_leg_extension_machine,
  has_leg_press_machine, has_seated_leg_press_machine, has_lying_leg_curl_machine,
  has_seated_leg_curl_machine, has_seated_calf_raise_machine, has_squat_machine,
  has_standing_calf_raise_machine,

  -- Other equipment
  has_battle_rope, has_foam_roller, has_medicine_ball, has_dip_belt,
  has_weight_vest, has_lifting_straps, has_plyo_box, has_balance_ball,

  equipment_notes,
  data_source, equipment_last_verified_at
) values
(
  'IronBase HK (Wan Chai)', 'IronBase HK（灣仔）', 'ironbase-hk-wan-chai',
  '1 Harbour Rd, Wan Chai, Hong Kong', '香港灣仔港灣道1號', 'HK-WC', 'HK', null,
  22.2793, 114.1720,
  'large', 6000,
  200.00, true, true,

  6, 8, 4, 4, 60.0, 1.25, 25.0,
  true, true, true, true,
  true, true, true,
  true, true, false, false,

  8, 3, 4, 1,

  2, 2, 4, 1,
  true, 2, 2, 4,
  1, 1,
  true, 2, 2, 1,
  true, 2, 2, 1,

  4, true, true,

  2,
  true, true,
  true, true, true, true, true,
  true, true, true, true, true,
  true, true, true, true,
  true, true, true, true, true, true, true, true, true, true,

  true, true, true, true,
  true, true, true, true,

  'Strong free-weight setup with HYROX-friendly conditioning kit.',
  'admin', now()
),
(
  'Lift District Mong Kok', 'Lift District 旺角', 'lift-district-mong-kok',
  '68 Argyle St, Mong Kok, Hong Kong', '香港旺角亞皆老街68號', 'HK-YTM', 'HK', null,
  22.3193, 114.1694,
  'medium', 3500,
  180.00, true, true,

  4, 6, 3, 2, 50.0, 2.5, 25.0,
  false, true, true, false,
  false, false, false,
  true, false, false, true,

  6, 2, 3, 0,

  1, 1, 2, 0,
  true, 1, 1, 2,
  1, 0,
  false, 0, 1, 0,
  true, 1, 1, 0,

  3, true, false,

  0,
  true, true,
  true, false, false, true, false,
  true, true, false, false, true,
  true, false, true, false,
  false, false, true, true, false, true, true, false, true, false,

  false, true, true, false,
  false, false, true, true,

  'Compact gym with solid basics and useful accessory work.',
  'admin', now()
),
(
  'RackSpace Sha Tin', 'RackSpace 沙田', 'rackspace-sha-tin',
  '2-8 Yuen Wo Rd, Sha Tin, Hong Kong', '香港沙田源禾路2-8號', 'HK-ST', 'HK', null,
  22.3832, 114.1876,
  'large', 8000,
  150.00, true, false,

  8, 10, 6, 6, 70.0, 1.25, 25.0,
  true, true, true, true,
  true, false, true,
  true, true, true, false,

  10, 4, 6, 2,

  3, 2, 6, 2,
  true, 2, 4, 6,
  1, 1,
  true, 2, 4, 2,
  true, 2, 2, 2,

  6, true, true,

  2,
  true, true,
  true, true, true, true, true,
  true, true, true, true, true,
  true, true, true, true,
  true, true, true, true, true, true, true, true, true, true,

  true, true, true, false,
  true, true, true, true,

  'Large rack-heavy gym with plenty of conditioning space.',
  'user_submission', now() - interval '7 days'
),
(
  'Flex Studio Central', 'Flex Studio 中環', 'flex-studio-central',
  '18 Queen''s Rd Central, Central, Hong Kong', '香港中環皇后大道中18號', 'HK-CW', 'HK', null,
  22.2825, 114.1558,
  'small', 1200,
  280.00, true, true,

  1, 3, 1, 1, 40.0, 2.5, 20.0,
  false, false, true, false,
  false, false, false,
  false, false, false, false,

  4, 1, 2, 0,

  0, 0, 2, 0,
  true, 0, 1, 1,
  0, 0,
  false, 0, 0, 0,
  false, 0, 0, 0,

  2, true, false,

  1,
  false, false,
  true, false, false, true, true,
  true, true, false, false, false,
  true, true, true, false,
  true, true, true, true, false, true, true, true, false, true,

  false, true, true, false,
  false, false, true, true,

  'Small central studio with enough kit for general strength training.',
  'admin', now()
),
(
  'HYROX Hub Kwun Tong', 'HYROX Hub 觀塘', 'hyrox-hub-kwun-tong',
  '12 Hoi Yuen Rd, Kwun Tong, Hong Kong', '香港觀塘開源道12號', 'HK-KT', 'HK', null,
  22.3124, 114.2261,
  'large', 5500,
  160.00, true, true,

  4, 6, 3, 2, 50.0, 2.5, 25.0,
  false, true, true, false,
  false, false, false,
  true, false, false, false,

  8, 6, 4, 1,

  4, 4, 8, 2,
  true, 4, 6, 10,
  1, 1,
  true, 4, 6, 4,
  true, 4, 4, 2,

  3, true, true,

  0,
  true, true,
  true, false, false, true, false,
  true, true, false, true, false,
  false, false, true, false,
  false, false, true, true, false, true, true, false, true, false,

  true, true, true, false,
  true, false, true, true,

  'HYROX-focused gym with wall balls, sleds, rowers, and ski ergs.',
  'admin', now()
);

-- Demo gym-brand mappings
insert into gym_brand_inventory (gym_id, brand_id, confidence)
select g.id, b.id, 'confirmed'
from gyms g
join equipment_brands b on b.slug in ('eleiko', 'rogue-fitness', 'hammer-strength', 'concept2')
where g.slug = 'ironbase-hk-wan-chai'
on conflict (gym_id, brand_id) do update
set confidence = excluded.confidence,
    updated_at = now();

insert into gym_brand_inventory (gym_id, brand_id, confidence)
select g.id, b.id, 'confirmed'
from gyms g
join equipment_brands b on b.slug in ('life-fitness', 'matrix-fitness', 'precor')
where g.slug = 'lift-district-mong-kok'
on conflict (gym_id, brand_id) do update
set confidence = excluded.confidence,
    updated_at = now();

insert into gym_brand_inventory (gym_id, brand_id, confidence)
select g.id, b.id, 'confirmed'
from gyms g
join equipment_brands b on b.slug in ('concept2', 'assault-fitness', 'rogue-fitness')
where g.slug = 'hyrox-hub-kwun-tong'
on conflict (gym_id, brand_id) do update
set confidence = excluded.confidence,
    updated_at = now();
