-- Sample seed data — 5 Singapore gyms for local dev / testing
-- Run after all migrations

insert into gyms (
  name, slug, address, district, country, postal_code,
  lat, lng,
  size_category, estimated_size_sqft,
  day_pass_price, is_active, is_verified,
  rack_count, bench_count, barbell_count,
  dumbbell_max_weight_kg,
  assault_bike_count, ski_erg_count, rower_count, sled_count,
  cable_machine_count, lat_pulldown_count, chest_press_count,
  leg_press_count, hack_squat_count,
  has_smith_machine, has_deadlift_platform, has_pull_up_bar,
  equipment_tags,
  data_source, equipment_last_verified_at
) values
(
  'IronBase SG (Tanjong Pagar)', 'ironbase-sg-tanjong-pagar',
  '1 Anson Rd, #01-01, Singapore 079903', 'Tanjong Pagar', 'Singapore', '079903',
  1.2763, 103.8430,
  'large', 6000,
  25.00, true, true,
  6, 8, 4, 60.0,
  3, 2, 4, 1,
  4, 2, 2, 2, 1,
  true, true, true,
  array['trap_bar', 'safety_squat_bar', 'dip_belt'],
  'admin', now()
),
(
  'Lift District Novena', 'lift-district-novena',
  '101 Thomson Rd, Singapore 307591', 'Novena', 'Singapore', '307591',
  1.3201, 103.8434,
  'medium', 3500,
  20.00, true, true,
  4, 6, 3, 50.0,
  2, 1, 2, 0,
  3, 1, 1, 1, 1,
  false, true, true,
  array['kettlebells', 'landmine'],
  'admin', now()
),
(
  'RackSpace Jurong East', 'rackspace-jurong-east',
  '3 Gateway Dr, Singapore 608532', 'Jurong East', 'Singapore', '608532',
  1.3334, 103.7436,
  'large', 8000,
  18.00, true, false,
  8, 10, 6, 70.0,
  4, 2, 6, 2,
  6, 3, 3, 3, 2,
  true, true, true,
  array['trap_bar', 'farmer_handles', 'yoke'],
  'user_submission', now() - interval '7 days'
),
(
  'Flex Studio Orchard', 'flex-studio-orchard',
  '391 Orchard Rd, Singapore 238872', 'Orchard', 'Singapore', '238872',
  1.3009, 103.8356,
  'small', 1200,
  30.00, true, true,
  1, 3, 1, 40.0,
  1, 0, 2, 0,
  2, 1, 1, 1, 0,
  true, false, true,
  array['trx'],
  'admin', now()
),
(
  'HYROX Hub Tampines', 'hyrox-hub-tampines',
  '10 Tampines Central 1, Singapore 529536', 'Tampines', 'Singapore', '529536',
  1.3521, 103.9451,
  'large', 5500,
  22.00, true, true,
  4, 6, 3, 50.0,
  6, 4, 8, 2,
  3, 2, 1, 2, 1,
  false, true, true,
  array['plyo_boxes', 'medicine_balls', 'battle_ropes'],
  'admin', now()
);
