-- Sample seed data — 5 Hong Kong gyms for local dev / testing
-- Run after all migrations

insert into gyms (
  name, name_zh, slug, address, address_zh, district_code, country_code, postal_code,
  lat, lng,
  size_category, estimated_size_sqft,
  day_pass_price, is_active, is_verified,
  rack_count, bench_count, barbell_count,
  dumbbell_max_weight_kg,
  assault_bike_count, ski_erg_count, rower_count, sled_count, wall_ball_count,
  cable_machine_count, lat_pulldown_count, chest_press_count,
  leg_press_count, hack_squat_count,
  has_smith_machine, has_deadlift_platform, has_pull_up_bar,
  equipment_tags,
  data_source, equipment_last_verified_at
) values
(
  'IronBase HK (Wan Chai)', 'IronBase HK（灣仔）', 'ironbase-hk-wan-chai',
  '1 Harbour Rd, Wan Chai, Hong Kong', '香港灣仔港灣道1號', 'HK-WC', 'HK', null,
  22.2793, 114.1720,
  'large', 6000,
  200.00, true, true,
  6, 8, 4, 60.0,
  3, 2, 4, 1, 4,
  4, 2, 2, 2, 1,
  true, true, true,
  array['trap_bar', 'safety_squat_bar', 'dip_belt'],
  'admin', now()
),
(
  'Lift District Mong Kok', 'Lift District 旺角', 'lift-district-mong-kok',
  '68 Argyle St, Mong Kok, Hong Kong', '香港旺角亞皆老街68號', 'HK-YTM', 'HK', null,
  22.3193, 114.1694,
  'medium', 3500,
  180.00, true, true,
  4, 6, 3, 50.0,
  2, 1, 2, 0, 2,
  3, 1, 1, 1, 1,
  false, true, true,
  array['kettlebells', 'landmine'],
  'admin', now()
),
(
  'RackSpace Sha Tin', 'RackSpace 沙田', 'rackspace-sha-tin',
  '2-8 Yuen Wo Rd, Sha Tin, Hong Kong', '香港沙田源禾路2-8號', 'HK-ST', 'HK', null,
  22.3832, 114.1876,
  'large', 8000,
  150.00, true, false,
  8, 10, 6, 70.0,
  4, 2, 6, 2, 6,
  6, 3, 3, 3, 2,
  true, true, true,
  array['trap_bar', 'farmer_handles', 'yoke'],
  'user_submission', now() - interval '7 days'
),
(
  'Flex Studio Central', 'Flex Studio 中環', 'flex-studio-central',
  '18 Queen''s Rd Central, Central, Hong Kong', '香港中環皇后大道中18號', 'HK-CW', 'HK', null,
  22.2825, 114.1558,
  'small', 1200,
  280.00, true, true,
  1, 3, 1, 40.0,
  1, 0, 2, 0, 1,
  2, 1, 1, 1, 0,
  true, false, true,
  array['trx'],
  'admin', now()
),
(
  'HYROX Hub Kwun Tong', 'HYROX Hub 觀塘', 'hyrox-hub-kwun-tong',
  '12 Hoi Yuen Rd, Kwun Tong, Hong Kong', '香港觀塘開源道12號', 'HK-KT', 'HK', null,
  22.3124, 114.2261,
  'large', 5500,
  160.00, true, true,
  4, 6, 3, 50.0,
  6, 4, 8, 2, 10,
  3, 2, 1, 2, 1,
  false, true, true,
  array['plyo_boxes', 'medicine_balls', 'battle_ropes'],
  'admin', now()
);
