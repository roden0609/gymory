-- Deploy before the application switches gym-chain filters to equality/IN.
-- Codes are public classification; provenance and all other new columns remain private.
begin;
alter table public.gyms add column gym_chain_code text
  check (gym_chain_code in ('247','anytime','efx24','go24','lcsd','pure','snap'));

create function public.gym_chain_code_from_slug(p_slug text)
returns text language sql immutable set search_path = '' as $$
  select case
    when starts_with(p_slug, '24-7-fitness-') then '247'
    when starts_with(p_slug, 'anytime-fitness-') then 'anytime'
    when starts_with(p_slug, 'efx24-') then 'efx24'
    when starts_with(p_slug, 'go24-fitness-') then 'go24'
    when starts_with(p_slug, 'lcsd-') then 'lcsd'
    when starts_with(p_slug, 'pure-fitness-') then 'pure'
    when starts_with(p_slug, 'snap-fitness-') then 'snap'
    else null end;
$$;
revoke all on function public.gym_chain_code_from_slug(text) from public, anon, authenticated;

update public.gyms set gym_chain_code = public.gym_chain_code_from_slug(slug);

-- Existing import/admin inserts need no new payload: default only on INSERT.
-- An explicit code wins; a later slug rename does not overwrite classification.
create function public.default_gym_chain_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.gym_chain_code is null then
    new.gym_chain_code := public.gym_chain_code_from_slug(new.slug);
  end if;
  return new;
end;
$$;
revoke all on function public.default_gym_chain_code() from public, anon, authenticated;
grant execute on function public.gym_chain_code_from_slug(text) to service_role;
grant execute on function public.default_gym_chain_code() to service_role;
create trigger default_gym_chain_code before insert on public.gyms
for each row execute function public.default_gym_chain_code();

create index idx_gyms_active_chain on public.gyms(gym_chain_code) where is_active = true;

create or replace view public.gyms_public with (security_invoker = true) as
select
  g.id,
  g.name,
  g.name_zh,
  g.slug,
  g.district_code,
  g.address,
  g.address_zh,
  g.lat,
  g.lng,
  ((inventory.items -> 'rack'::text) ->> 'quantity'::text)::integer AS rack_count,
  ((inventory.items -> 'bench'::text) ->> 'quantity'::text)::integer AS bench_count,
  ((inventory.items -> 'barbell'::text) ->> 'quantity'::text)::integer AS barbell_count,
  ((inventory.items -> 'platform'::text) ->> 'quantity'::text)::integer AS platform_count,
  g.dumbbell_min_weight_kg,
  g.dumbbell_max_weight_kg,
  g.plate_min_weight_kg,
  g.plate_max_weight_kg,
  ((inventory.items -> 'roman_chair'::text) ->> 'effective_present'::text)::boolean AS has_roman_chair,
  ((inventory.items -> 'trap_bar'::text) ->> 'effective_present'::text)::boolean AS has_trap_bar,
  ((inventory.items -> 'safety_squat_bar'::text) ->> 'effective_present'::text)::boolean AS has_safety_squat_bar,
  ((inventory.items -> 'farmer_handles'::text) ->> 'effective_present'::text)::boolean AS has_farmer_handles,
  ((inventory.items -> 'landmine_attachment'::text) ->> 'effective_present'::text)::boolean AS has_landmine_attachment,
  ((inventory.items -> 'swiss_bar'::text) ->> 'effective_present'::text)::boolean AS has_swiss_bar,
  ((inventory.items -> 'cambered_bar'::text) ->> 'effective_present'::text)::boolean AS has_cambered_bar,
  ((inventory.items -> 'ez_bar'::text) ->> 'effective_present'::text)::boolean AS has_ez_bar,
  ((inventory.items -> 'treadmill'::text) ->> 'quantity'::text)::integer AS treadmill_count,
  ((inventory.items -> 'assault_bike'::text) ->> 'quantity'::text)::integer AS assault_bike_count,
  ((inventory.items -> 'exercise_bike'::text) ->> 'quantity'::text)::integer AS exercise_bike_count,
  ((inventory.items -> 'climber'::text) ->> 'quantity'::text)::integer AS climber_count,
  ((inventory.items -> 'elliptical_machine'::text) ->> 'quantity'::text)::integer AS elliptical_machine_count,
  ((inventory.items -> 'assault_runner'::text) ->> 'quantity'::text)::integer AS assault_runner_count,
  ((inventory.items -> 'ski_erg'::text) ->> 'quantity'::text)::integer AS ski_erg_count,
  ((inventory.items -> 'rower'::text) ->> 'quantity'::text)::integer AS rower_count,
  ((inventory.items -> 'sled'::text) ->> 'quantity'::text)::integer AS sled_count,
  ((inventory.items -> 'wall_ball'::text) ->> 'effective_present'::text)::boolean AS has_wall_ball,
  ((inventory.items -> 'wall_ball'::text) ->> 'quantity'::text)::integer AS wall_ball_count,
  ((inventory.items -> 'wall_ball_4kg'::text) ->> 'quantity'::text)::integer AS wall_ball_4kg_count,
  ((inventory.items -> 'wall_ball_6kg'::text) ->> 'quantity'::text)::integer AS wall_ball_6kg_count,
  ((inventory.items -> 'wall_ball_8kg'::text) ->> 'quantity'::text)::integer AS wall_ball_8kg_count,
  ((inventory.items -> 'wall_ball_9kg'::text) ->> 'quantity'::text)::integer AS wall_ball_9kg_count,
  ((inventory.items -> 'wall_ball_10kg'::text) ->> 'quantity'::text)::integer AS wall_ball_10kg_count,
  ((inventory.items -> 'wall_ball_plate_9ft'::text) ->> 'quantity'::text)::integer AS wall_ball_plate_9ft_count,
  ((inventory.items -> 'wall_ball_plate_10ft'::text) ->> 'quantity'::text)::integer AS wall_ball_plate_10ft_count,
  ((inventory.items -> 'workout_sandbag'::text) ->> 'effective_present'::text)::boolean AS has_workout_sandbag,
  ((inventory.items -> 'boxing_sandbag'::text) ->> 'effective_present'::text)::boolean AS has_boxing_sandbag,
  ((inventory.items -> 'sandbag_5kg'::text) ->> 'quantity'::text)::integer AS sandbag_5kg_count,
  ((inventory.items -> 'sandbag_10kg'::text) ->> 'quantity'::text)::integer AS sandbag_10kg_count,
  ((inventory.items -> 'sandbag_15kg'::text) ->> 'quantity'::text)::integer AS sandbag_15kg_count,
  ((inventory.items -> 'sandbag_20kg'::text) ->> 'quantity'::text)::integer AS sandbag_20kg_count,
  ((inventory.items -> 'sandbag_25kg'::text) ->> 'quantity'::text)::integer AS sandbag_25kg_count,
  ((inventory.items -> 'sandbag_30kg'::text) ->> 'quantity'::text)::integer AS sandbag_30kg_count,
  ((inventory.items -> 'kettlebell'::text) ->> 'effective_present'::text)::boolean AS has_kettlebell,
  ((inventory.items -> 'kettlebell_4kg'::text) ->> 'quantity'::text)::integer AS kettlebell_4kg_count,
  ((inventory.items -> 'kettlebell_6kg'::text) ->> 'quantity'::text)::integer AS kettlebell_6kg_count,
  ((inventory.items -> 'kettlebell_8kg'::text) ->> 'quantity'::text)::integer AS kettlebell_8kg_count,
  ((inventory.items -> 'kettlebell_10kg'::text) ->> 'quantity'::text)::integer AS kettlebell_10kg_count,
  ((inventory.items -> 'kettlebell_12kg'::text) ->> 'quantity'::text)::integer AS kettlebell_12kg_count,
  ((inventory.items -> 'kettlebell_14kg'::text) ->> 'quantity'::text)::integer AS kettlebell_14kg_count,
  ((inventory.items -> 'kettlebell_16kg'::text) ->> 'quantity'::text)::integer AS kettlebell_16kg_count,
  ((inventory.items -> 'kettlebell_18kg'::text) ->> 'quantity'::text)::integer AS kettlebell_18kg_count,
  ((inventory.items -> 'kettlebell_20kg'::text) ->> 'quantity'::text)::integer AS kettlebell_20kg_count,
  ((inventory.items -> 'kettlebell_24kg'::text) ->> 'quantity'::text)::integer AS kettlebell_24kg_count,
  ((inventory.items -> 'kettlebell_32kg'::text) ->> 'quantity'::text)::integer AS kettlebell_32kg_count,
  ((inventory.items -> 'cable_machine'::text) ->> 'quantity'::text)::integer AS cable_machine_count,
  ((inventory.items -> 'lat_pulldown_cable'::text) ->> 'effective_present'::text)::boolean AS has_lat_pulldown_cable,
  ((inventory.items -> 'seated_row_cable'::text) ->> 'effective_present'::text)::boolean AS has_seated_row_cable,
  ((inventory.items -> 'smith_machine'::text) ->> 'quantity'::text)::integer AS smith_machine_count,
  ((inventory.items -> 'smith_machine'::text) ->> 'effective_present'::text)::boolean AS has_smith_machine,
  ((inventory.items -> 'deadlift_platform'::text) ->> 'effective_present'::text)::boolean AS has_deadlift_platform,
  ((inventory.items -> 'pull_up_bar'::text) ->> 'effective_present'::text)::boolean AS has_pull_up_bar,
  ((inventory.items -> 'dip_station'::text) ->> 'effective_present'::text)::boolean AS has_dip_station,
  ((inventory.items -> 'trx'::text) ->> 'effective_present'::text)::boolean AS has_trx,
  ((inventory.items -> 'resistance_band'::text) ->> 'effective_present'::text)::boolean AS has_resistance_band,
  ((inventory.items -> 'battle_rope'::text) ->> 'effective_present'::text)::boolean AS has_battle_ropes,
  ((inventory.items -> 'rings'::text) ->> 'effective_present'::text)::boolean AS has_rings,
  ((inventory.items -> 'glute_ham_developer'::text) ->> 'effective_present'::text)::boolean AS has_glute_ham_developer,
  ((inventory.items -> 'reverse_hyper'::text) ->> 'effective_present'::text)::boolean AS has_reverse_hyper,
  ((inventory.items -> 'farmer_handles'::text) ->> 'effective_present'::text)::boolean AS has_farmers_handles,
  ((inventory.items -> 'preacher_curl_bench'::text) ->> 'effective_present'::text)::boolean AS has_preacher_curl_bench,
  ((inventory.items -> 'bicep_curl_machine'::text) ->> 'effective_present'::text)::boolean AS has_bicep_curl_machine,
  ((inventory.items -> 'tricep_extension_machine'::text) ->> 'effective_present'::text)::boolean AS has_tricep_extension_machine,
  ((inventory.items -> 'dip_machine'::text) ->> 'effective_present'::text)::boolean AS has_dip_machine,
  ((inventory.items -> 'chest_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_chest_press_machine,
  ((inventory.items -> 'incline_chest_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_incline_chest_press_machine,
  ((inventory.items -> 'decline_chest_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_decline_chest_press_machine,
  ((inventory.items -> 'bench_rack'::text) ->> 'effective_present'::text)::boolean AS has_bench_rack,
  ((inventory.items -> 'incline_bench_rack'::text) ->> 'effective_present'::text)::boolean AS has_incline_bench_rack,
  ((inventory.items -> 'iso_lateral_chest_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_iso_lateral_chest_press_machine,
  ((inventory.items -> 'pec_deck_machine'::text) ->> 'effective_present'::text)::boolean AS has_pec_deck_machine,
  ((inventory.items -> 'chest_fly_machine'::text) ->> 'effective_present'::text)::boolean AS has_chest_fly_machine,
  ((inventory.items -> 'lat_pulldown_machine'::text) ->> 'effective_present'::text)::boolean AS has_lat_pulldown_machine,
  ((inventory.items -> 'seated_row_machine'::text) ->> 'effective_present'::text)::boolean AS has_seated_row_machine,
  ((inventory.items -> 'back_extension_machine'::text) ->> 'effective_present'::text)::boolean AS has_back_extension_machine,
  ((inventory.items -> 'iso_lateral_row_machine'::text) ->> 'effective_present'::text)::boolean AS has_iso_lateral_row_machine,
  ((inventory.items -> 't_bar_row_machine'::text) ->> 'effective_present'::text)::boolean AS has_t_bar_row_machine,
  ((inventory.items -> 'pull_over_machine'::text) ->> 'effective_present'::text)::boolean AS has_pull_over_machine,
  ((inventory.items -> 'overhead_chair'::text) ->> 'effective_present'::text)::boolean AS has_overhead_chair,
  ((inventory.items -> 'lateral_raise_machine'::text) ->> 'effective_present'::text)::boolean AS has_lateral_raise_machine,
  ((inventory.items -> 'standing_lateral_raise_machine'::text) ->> 'effective_present'::text)::boolean AS has_standing_lateral_raise_machine,
  ((inventory.items -> 'reverse_fly_machine'::text) ->> 'effective_present'::text)::boolean AS has_reverse_fly_machine,
  ((inventory.items -> 'shoulder_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_shoulder_press_machine,
  ((inventory.items -> 'iso_lateral_shoulder_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_iso_lateral_shoulder_press_machine,
  ((inventory.items -> 'multi_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_multi_press_machine,
  ((inventory.items -> 'multi_hip_machine'::text) ->> 'effective_present'::text)::boolean AS has_multi_hip_machine,
  ((inventory.items -> 'stretching_machine'::text) ->> 'effective_present'::text)::boolean AS has_stretching_machine,
  ((inventory.items -> 'mobility_stick'::text) ->> 'effective_present'::text)::boolean AS has_mobility_stick,
  ((inventory.items -> 'hip_abductor_machine'::text) ->> 'effective_present'::text)::boolean AS has_hip_abductor_machine,
  ((inventory.items -> 'hip_adductor_machine'::text) ->> 'effective_present'::text)::boolean AS has_hip_adductor_machine,
  ((inventory.items -> 'leg_extension_machine'::text) ->> 'effective_present'::text)::boolean AS has_leg_extension_machine,
  ((inventory.items -> 'leg_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_leg_press_machine,
  ((inventory.items -> 'seated_leg_press_machine'::text) ->> 'effective_present'::text)::boolean AS has_seated_leg_press_machine,
  ((inventory.items -> 'lying_leg_curl_machine'::text) ->> 'effective_present'::text)::boolean AS has_lying_leg_curl_machine,
  ((inventory.items -> 'seated_leg_curl_machine'::text) ->> 'effective_present'::text)::boolean AS has_seated_leg_curl_machine,
  ((inventory.items -> 'seated_calf_raise_machine'::text) ->> 'effective_present'::text)::boolean AS has_seated_calf_raise_machine,
  ((inventory.items -> 'squat_machine'::text) ->> 'effective_present'::text)::boolean AS has_squat_machine,
  ((inventory.items -> 'hack_squat'::text) ->> 'effective_present'::text)::boolean AS has_hack_squat,
  ((inventory.items -> 'belt_squat_machine'::text) ->> 'effective_present'::text)::boolean AS has_belt_squat_machine,
  ((inventory.items -> 'standing_calf_raise_machine'::text) ->> 'effective_present'::text)::boolean AS has_standing_calf_raise_machine,
  ((inventory.items -> 'glute_extension_machine'::text) ->> 'effective_present'::text)::boolean AS has_glute_extension_machine,
  ((inventory.items -> 'hip_thrust_machine'::text) ->> 'effective_present'::text)::boolean AS has_hip_thrust_machine,
  ((inventory.items -> 'battle_rope'::text) ->> 'effective_present'::text)::boolean AS has_battle_rope,
  ((inventory.items -> 'foam_roller'::text) ->> 'effective_present'::text)::boolean AS has_foam_roller,
  ((inventory.items -> 'medicine_ball'::text) ->> 'effective_present'::text)::boolean AS has_medicine_ball,
  ((inventory.items -> 'exercise_stepper'::text) ->> 'effective_present'::text)::boolean AS has_exercise_stepper,
  ((inventory.items -> 'ab_roller'::text) ->> 'effective_present'::text)::boolean AS has_ab_roller,
  ((inventory.items -> 'massage_ball'::text) ->> 'effective_present'::text)::boolean AS has_massage_ball,
  ((inventory.items -> 'dip_belt'::text) ->> 'effective_present'::text)::boolean AS has_dip_belt,
  ((inventory.items -> 'weight_vest'::text) ->> 'effective_present'::text)::boolean AS has_weight_vest,
  ((inventory.items -> 'lifting_straps'::text) ->> 'effective_present'::text)::boolean AS has_lifting_straps,
  ((inventory.items -> 'plyo_box'::text) ->> 'effective_present'::text)::boolean AS has_plyo_box,
  ((inventory.items -> 'balance_ball'::text) ->> 'effective_present'::text)::boolean AS has_balance_ball,
  g.has_washroom,
  g.has_bathroom,
  g.has_changing_room,
  g.has_free_water,
  g.has_dry_sauna,
  g.has_wet_sauna,
  g.has_ice_bath,
  ((inventory.items -> 'yoga_block'::text) ->> 'effective_present'::text)::boolean AS has_yoga_block,
  ((inventory.items -> 'yoga_mat'::text) ->> 'effective_present'::text)::boolean AS has_yoga_mat,
  ((inventory.items -> 'ab_crunch_bench'::text) ->> 'effective_present'::text)::boolean AS has_ab_crunch_bench,
  ((inventory.items -> 'torso_rotation_machine'::text) ->> 'effective_present'::text)::boolean AS has_torso_rotation_machine,
  ((inventory.items -> 'ab_crunch_machine'::text) ->> 'effective_present'::text)::boolean AS has_ab_crunch_machine,
  g.equipment_notes,
  g.is_verified,
  g.is_hyrox_official,
  g.data_accuracy_status,
  g.updated_at,
  g.country_code,
  g.postal_code,
  g.size_category,
  g.estimated_size_sqft,
  g.day_pass_price,
  g.opening_hours_json,
  g.website_url,
  g.instagram_url,
  g.contact_phone,
  g.equipment_last_verified_at,
  null::text as data_source,
  g.is_active,
  g.gym_chain_code
from public.gyms g
left join lateral (
  select jsonb_object_agg(
    gei.equipment_code,
    jsonb_build_object(
      'effective_present', coalesce(gei.is_present, gei.quantity > 0),
      'quantity', gei.quantity
    )
  ) as items
  from public.gym_equipment_type_inventory gei
  where gei.gym_id = g.id
) inventory on true;

create or replace view public.gym_brand_overview_public with (security_invoker = true) as
select g.slug, g.district_code, g.is_active, g.dumbbell_max_weight_kg,
  g.has_bathroom, g.has_changing_room, g.has_free_water,
  ((inventory.items -> 'rack') ->> 'quantity')::integer as rack_count,
  ((inventory.items -> 'treadmill') ->> 'quantity')::integer as treadmill_count,
  ((inventory.items -> 'rower') ->> 'quantity')::integer as rower_count,
  g.gym_chain_code
from public.gyms g
left join lateral (
  select jsonb_object_agg(i.equipment_code, jsonb_build_object('quantity', i.quantity)) as items
  from public.gym_equipment_type_inventory i
  where i.gym_id = g.id and i.equipment_code in ('rack', 'treadmill', 'rower')
) inventory on true;

create or replace view public.gym_search_public with (security_invoker = true) as
select
  g.id,
  g.name,
  g.name_zh,
  g.slug,
  g.district_code,
  g.address,
  g.address_zh,
  g.lat,
  g.lng,
  g.rack_count,
  g.bench_count,
  g.barbell_count,
  g.platform_count,
  g.dumbbell_min_weight_kg,
  g.dumbbell_max_weight_kg,
  g.plate_min_weight_kg,
  g.plate_max_weight_kg,
  g.has_roman_chair,
  g.has_trap_bar,
  g.has_safety_squat_bar,
  g.has_farmer_handles,
  g.has_landmine_attachment,
  g.has_swiss_bar,
  g.has_cambered_bar,
  g.has_ez_bar,
  g.treadmill_count,
  g.assault_bike_count,
  g.exercise_bike_count,
  g.climber_count,
  g.elliptical_machine_count,
  g.assault_runner_count,
  g.ski_erg_count,
  g.rower_count,
  g.sled_count,
  g.has_wall_ball,
  g.wall_ball_count,
  g.wall_ball_4kg_count,
  g.wall_ball_6kg_count,
  g.wall_ball_8kg_count,
  g.wall_ball_9kg_count,
  g.wall_ball_10kg_count,
  g.wall_ball_plate_9ft_count,
  g.wall_ball_plate_10ft_count,
  g.has_workout_sandbag,
  g.has_boxing_sandbag,
  g.sandbag_5kg_count,
  g.sandbag_10kg_count,
  g.sandbag_15kg_count,
  g.sandbag_20kg_count,
  g.sandbag_25kg_count,
  g.sandbag_30kg_count,
  g.has_kettlebell,
  g.kettlebell_4kg_count,
  g.kettlebell_6kg_count,
  g.kettlebell_8kg_count,
  g.kettlebell_10kg_count,
  g.kettlebell_12kg_count,
  g.kettlebell_14kg_count,
  g.kettlebell_16kg_count,
  g.kettlebell_18kg_count,
  g.kettlebell_20kg_count,
  g.kettlebell_24kg_count,
  g.kettlebell_32kg_count,
  g.cable_machine_count,
  g.has_lat_pulldown_cable,
  g.has_seated_row_cable,
  g.smith_machine_count,
  g.has_smith_machine,
  g.has_deadlift_platform,
  g.has_pull_up_bar,
  g.has_dip_station,
  g.has_trx,
  g.has_resistance_band,
  g.has_battle_ropes,
  g.has_rings,
  g.has_glute_ham_developer,
  g.has_reverse_hyper,
  g.has_farmers_handles,
  g.has_preacher_curl_bench,
  g.has_bicep_curl_machine,
  g.has_tricep_extension_machine,
  g.has_dip_machine,
  g.has_chest_press_machine,
  g.has_incline_chest_press_machine,
  g.has_decline_chest_press_machine,
  g.has_bench_rack,
  g.has_incline_bench_rack,
  g.has_iso_lateral_chest_press_machine,
  g.has_pec_deck_machine,
  g.has_chest_fly_machine,
  g.has_lat_pulldown_machine,
  g.has_seated_row_machine,
  g.has_back_extension_machine,
  g.has_iso_lateral_row_machine,
  g.has_t_bar_row_machine,
  g.has_pull_over_machine,
  g.has_overhead_chair,
  g.has_lateral_raise_machine,
  g.has_standing_lateral_raise_machine,
  g.has_reverse_fly_machine,
  g.has_shoulder_press_machine,
  g.has_iso_lateral_shoulder_press_machine,
  g.has_multi_press_machine,
  g.has_multi_hip_machine,
  g.has_stretching_machine,
  g.has_mobility_stick,
  g.has_hip_abductor_machine,
  g.has_hip_adductor_machine,
  g.has_leg_extension_machine,
  g.has_leg_press_machine,
  g.has_seated_leg_press_machine,
  g.has_lying_leg_curl_machine,
  g.has_seated_leg_curl_machine,
  g.has_seated_calf_raise_machine,
  g.has_squat_machine,
  g.has_hack_squat,
  g.has_belt_squat_machine,
  g.has_standing_calf_raise_machine,
  g.has_glute_extension_machine,
  g.has_hip_thrust_machine,
  g.has_battle_rope,
  g.has_foam_roller,
  g.has_medicine_ball,
  g.has_exercise_stepper,
  g.has_ab_roller,
  g.has_massage_ball,
  g.has_dip_belt,
  g.has_weight_vest,
  g.has_lifting_straps,
  g.has_plyo_box,
  g.has_balance_ball,
  g.has_washroom,
  g.has_bathroom,
  g.has_changing_room,
  g.has_free_water,
  g.has_dry_sauna,
  g.has_wet_sauna,
  g.has_ice_bath,
  g.has_yoga_block,
  g.has_yoga_mat,
  g.has_ab_crunch_bench,
  g.has_torso_rotation_machine,
  g.has_ab_crunch_machine,
  g.equipment_notes,
  g.is_verified,
  g.is_hyrox_official,
  g.data_accuracy_status,
  g.updated_at,
  g.is_active,
  g.estimated_size_sqft,
  coalesce(v.accuracy_like_count, 0)::integer as accuracy_like_count,
  coalesce(v.accuracy_dislike_count, 0)::integer as accuracy_dislike_count,
  coalesce(v.accuracy_total_votes, 0)::integer as accuracy_total_votes,
  g.gym_chain_code
from public.gyms_public g
left join (
  select gym_id,
    count(*) filter (where vote = 'like') as accuracy_like_count,
    count(*) filter (where vote = 'dislike') as accuracy_dislike_count,
    count(*) as accuracy_total_votes
  from public.gym_accuracy_votes
  group by gym_id
) v on v.gym_id = g.id
where g.is_active;

-- Explicit column grants only. Row restrictions continue through security_invoker.
grant select (gym_chain_code) on public.gyms to anon, authenticated;
grant select (gym_chain_code) on public.gyms_public to anon, authenticated;
grant select (gym_chain_code) on public.gym_search_public to anon, authenticated;
grant select (gym_chain_code) on public.gym_brand_overview_public to anon, authenticated;
analyze public.gyms;
notify pgrst, 'reload schema';
commit;
