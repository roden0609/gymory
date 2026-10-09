-- Controlled type summaries, model details, and eleven shared categories.
-- Preserve the pre-migration catalog assignments for recovery/auditing.
create table public.equipment_catalog_backup_0054 (
  entity text not null, id text not null, payload jsonb not null,
  primary key (entity, id)
);
alter table public.equipment_catalog_backup_0054 enable row level security;
revoke all on public.equipment_catalog_backup_0054 from public, anon, authenticated;
insert into public.equipment_catalog_backup_0054
select 'category', id::text, to_jsonb(c) from public.equipment_categories c
union all select 'equipment', id::text, to_jsonb(e) from public.equipment e
union all select 'type', code, to_jsonb(t) from public.equipment_types t;

alter table public.equipment_types add column labels text[] not null default '{}';
alter table public.equipment add column labels text[] not null default '{}';
alter table public.gym_equipment_type_inventory
  add column is_directly_reported boolean not null default true;

-- Labels describe the model; never infer a type's mechanism from one model.
update public.equipment e set labels = array[c.slug]
from public.equipment_categories c
where c.id = e.category_id and c.slug in ('plate-loaded', 'selectorized');

insert into public.equipment_categories (slug, name, name_zh, sort_order, parent_id, is_active)
values
  ('free-weight', 'Free weight', '自由重量', 10, null, true),
  ('cardio', 'Cardio', '帶氧運動', 20, null, true),
  ('cable', 'Cable', '滑輪器械', 30, null, true),
  ('full-body', 'Full body', '全身器械', 40, null, true),
  ('core', 'Core', '核心', 50, null, true),
  ('arm', 'Arm', '手臂', 60, null, true),
  ('chest', 'Chest', '胸部', 70, null, true),
  ('back', 'Back', '背部', 80, null, true),
  ('shoulder', 'Shoulder', '肩部', 90, null, true),
  ('leg', 'Leg', '腿部', 100, null, true),
  ('other', 'Other', '其他器材', 110, null, true)
on conflict (slug) do update set
  name = excluded.name, name_zh = excluded.name_zh,
  sort_order = excluded.sort_order, parent_id = null, is_active = true;

-- Predefined types and their shared labels. HYROX is an applicability label,
-- not a primary category; ordinary cardio/free weights retain their categories.
insert into public.equipment_types (code, name_en, name_zh, category, labels)
values
  ('ab_crunch_bench', 'Ab crunch bench', '捲腹椅', 'core', '{}'::text[]),
  ('ab_crunch_machine', 'Ab crunch machine', '捲腹機', 'core', '{}'::text[]),
  ('ab_roller', 'Ab roller', '健腹輪', 'other', '{}'::text[]),
  ('assault_bike', 'Assault bike', '風阻健身車', 'cardio', '{}'::text[]),
  ('assault_runner', 'Assault runner', '弧形跑步機', 'cardio', '{}'::text[]),
  ('back_extension_machine', 'Back extension machine', '背伸展機', 'back', '{}'::text[]),
  ('balance_ball', 'Balance ball', '平衡球', 'other', '{}'::text[]),
  ('barbell', 'Barbells', '槓鈴', 'free_weight', '{}'::text[]),
  ('battle_rope', 'Battle rope', '戰繩', 'other', '{}'::text[]),
  ('belt_squat_machine', 'Belt squat machine', '腰帶深蹲機', 'leg', '{}'::text[]),
  ('bench', 'Benches', '臥推椅', 'free_weight', '{}'::text[]),
  ('bench_rack', 'Bench rack', '臥推架', 'chest', '{}'::text[]),
  ('bicep_curl_machine', 'Bicep curl machine', '二頭彎舉機', 'arm', '{}'::text[]),
  ('boxing_sandbag', 'Boxing sandbag', '拳擊沙包', 'other', '{}'::text[]),
  ('cable_machine', 'Cable machine', 'Cable 機', 'cable', '{}'::text[]),
  ('cambered_bar', 'Cambered bar', '彎槓', 'free_weight', '{}'::text[]),
  ('chest_fly_machine', 'Chest fly machine', '飛鳥機', 'chest', '{}'::text[]),
  ('chest_press_machine', 'Chest press machine', '推胸機', 'chest', '{}'::text[]),
  ('climber', 'Climber', '登山機', 'cardio', '{}'::text[]),
  ('deadlift_platform', 'Platforms', '平台', 'free_weight', '{}'::text[]),
  ('decline_chest_press_machine', 'Decline chest press machine', '下斜推胸機', 'chest', '{}'::text[]),
  ('dip_belt', 'Dip belt', '負重腰帶', 'other', '{}'::text[]),
  ('dip_machine', 'Dip machine', '雙槓臂屈伸機', 'arm', '{}'::text[]),
  ('dip_station', 'Dip station', '雙槓', 'free_weight', '{}'::text[]),
  ('dumbbell', 'Dumbbell', '啞鈴', 'free_weight', '{}'::text[]),
  ('elliptical_machine', 'Elliptical machine', '橢圓機', 'cardio', '{}'::text[]),
  ('exercise_bike', 'Exercise bike', '健身單車', 'cardio', '{}'::text[]),
  ('exercise_stepper', 'Exercise stepper', '踏板', 'other', '{}'::text[]),
  ('ez_bar', 'EZ bar', 'EZ槓', 'free_weight', '{}'::text[]),
  ('farmer_handles', 'Farmer''s handles', '農夫行走把手', 'free_weight', array['hyrox']),
  ('foam_roller', 'Foam roller', '瑜伽柱', 'other', '{}'::text[]),
  ('glute_extension_machine', 'Glute extension machine', '臀部伸展機', 'leg', '{}'::text[]),
  ('glute_ham_developer', 'Glute ham developer', 'GHD', 'other', '{}'::text[]),
  ('hack_squat', 'Hack squat machine', '哈克深蹲機', 'leg', '{}'::text[]),
  ('hip_abductor_machine', 'Hip abductor machine', '髖外展機', 'leg', '{}'::text[]),
  ('hip_adductor_machine', 'Hip adductor machine', '髖內收機', 'leg', '{}'::text[]),
  ('hip_thrust_machine', 'Hip thrust machine', '臀推機', 'leg', '{}'::text[]),
  ('incline_bench_rack', 'Incline bench rack', '上斜臥推架', 'chest', '{}'::text[]),
  ('incline_chest_press_machine', 'Incline chest press machine', '上斜推胸機', 'chest', '{}'::text[]),
  ('iso_lateral_chest_press_machine', 'Iso-lateral chest press machine', 'Iso-lateral 推胸機', 'chest', '{}'::text[]),
  ('iso_lateral_row_machine', 'Iso-lateral row machine', 'Iso-lateral 划船機', 'back', '{}'::text[]),
  ('iso_lateral_shoulder_press_machine', 'Iso-lateral shoulder press machine', 'Iso-lateral 肩推機', 'shoulder', '{}'::text[]),
  ('kettlebell', 'Kettlebell', '壺鈴', 'free_weight', '{}'::text[]),
  ('kettlebell_10kg', 'Kettlebell 10kg', '壺鈴 10kg', 'free_weight', '{}'::text[]),
  ('kettlebell_12kg', 'Kettlebell 12kg', '壺鈴 12kg', 'free_weight', '{}'::text[]),
  ('kettlebell_14kg', 'Kettlebell 14kg', '壺鈴 14kg', 'free_weight', '{}'::text[]),
  ('kettlebell_16kg', 'Kettlebell 16kg', '壺鈴 16kg', 'free_weight', array['hyrox']),
  ('kettlebell_18kg', 'Kettlebell 18kg', '壺鈴 18kg', 'free_weight', '{}'::text[]),
  ('kettlebell_20kg', 'Kettlebell 20kg', '壺鈴 20kg', 'free_weight', '{}'::text[]),
  ('kettlebell_24kg', 'Kettlebell 24kg', '壺鈴 24kg', 'free_weight', array['hyrox']),
  ('kettlebell_32kg', 'Kettlebell 32kg', '壺鈴 32kg', 'free_weight', array['hyrox']),
  ('kettlebell_4kg', 'Kettlebell 4kg', '壺鈴 4kg', 'free_weight', '{}'::text[]),
  ('kettlebell_6kg', 'Kettlebell 6kg', '壺鈴 6kg', 'free_weight', '{}'::text[]),
  ('kettlebell_8kg', 'Kettlebell 8kg', '壺鈴 8kg', 'free_weight', '{}'::text[]),
  ('landmine_attachment', 'Landmine attachment', '地雷管', 'free_weight', '{}'::text[]),
  ('lat_pulldown_cable', 'Lat pulldown cable', '高位下拉 Cable', 'cable', '{}'::text[]),
  ('lat_pulldown_machine', 'Lat pulldown machine', '高位下拉機', 'back', '{}'::text[]),
  ('lateral_raise_machine', 'Lateral raise machine', '側平舉機', 'shoulder', '{}'::text[]),
  ('leg_extension_machine', 'Leg extension machine', '腿伸展機', 'leg', '{}'::text[]),
  ('leg_press_machine', 'Leg press machine', '腿推機', 'leg', '{}'::text[]),
  ('lifting_straps', 'Lifting straps', '拉力帶', 'other', '{}'::text[]),
  ('lying_leg_curl_machine', 'Lying leg curl machine', '臥式腿彎舉機', 'leg', '{}'::text[]),
  ('massage_ball', 'Massage ball', '按摩球', 'other', '{}'::text[]),
  ('medicine_ball', 'Medicine ball', '藥球', 'other', '{}'::text[]),
  ('mobility_stick', 'Mobility stick', '伸展棒', 'other', '{}'::text[]),
  ('multi_hip_machine', 'Multi hip machine', '多功能髖部訓練機', 'leg', '{}'::text[]),
  ('multi_press_machine', 'Multi press machine', '多功能推舉機', 'shoulder', '{}'::text[]),
  ('other_equipment', 'Other equipment', '其他器材', 'other', '{}'::text[]),
  ('overhead_chair', 'Overhead press chair', '肩上推舉椅', 'shoulder', '{}'::text[]),
  ('pec_deck_machine', 'Pec deck machine', 'Pec deck 機', 'chest', '{}'::text[]),
  ('platform', 'Platforms', '平台', 'free_weight', '{}'::text[]),
  ('plyo_box', 'Plyo box', '跳箱', 'other', '{}'::text[]),
  ('preacher_curl_bench', 'Preacher curl bench', '牧師椅彎舉椅', 'arm', '{}'::text[]),
  ('pull_over_machine', 'Pull-over machine', 'Pull-over 機', 'back', '{}'::text[]),
  ('pull_up_bar', 'Pull-up bar', '引體上升架', 'free_weight', '{}'::text[]),
  ('rack', 'Racks', '深蹲架', 'free_weight', '{}'::text[]),
  ('resistance_band', 'Resistance bands', '阻力帶', 'other', '{}'::text[]),
  ('reverse_fly_machine', 'Reverse fly machine', '反向飛鳥機', 'shoulder', '{}'::text[]),
  ('reverse_hyper', 'Reverse hyper', 'Reverse hyper', 'free_weight', '{}'::text[]),
  ('rings', 'Rings', '吊環', 'other', '{}'::text[]),
  ('roman_chair', 'Roman chair', '羅馬椅', 'core', '{}'::text[]),
  ('rower', 'Rower', '划船機', 'cardio', array['hyrox']),
  ('safety_squat_bar', 'Safety squat bar', '安全深蹲槓', 'free_weight', '{}'::text[]),
  ('sandbag_10kg', 'Workout sandbag 10kg', '訓練沙袋 10kg', 'other', array['hyrox']),
  ('sandbag_15kg', 'Workout sandbag 15kg', '訓練沙袋 15kg', 'other', '{}'::text[]),
  ('sandbag_20kg', 'Workout sandbag 20kg', '訓練沙袋 20kg', 'other', array['hyrox']),
  ('sandbag_25kg', 'Workout sandbag 25kg', '訓練沙袋 25kg', 'other', '{}'::text[]),
  ('sandbag_30kg', 'Workout sandbag 30kg', '訓練沙袋 30kg', 'other', array['hyrox']),
  ('sandbag_5kg', 'Workout sandbag 5kg', '訓練沙袋 5kg', 'other', '{}'::text[]),
  ('seated_calf_raise_machine', 'Seated calf raise machine', '坐姿提踵機', 'leg', '{}'::text[]),
  ('seated_leg_curl_machine', 'Seated leg curl machine', '坐姿腿彎舉機', 'leg', '{}'::text[]),
  ('seated_leg_press_machine', 'Seated leg press machine', '坐姿腿推機', 'leg', '{}'::text[]),
  ('seated_row_cable', 'Seated row cable', '坐姿划船 Cable', 'cable', '{}'::text[]),
  ('seated_row_machine', 'Seated row machine', '坐姿划船機', 'back', '{}'::text[]),
  ('shoulder_press_machine', 'Shoulder press machine', '肩推機', 'shoulder', '{}'::text[]),
  ('ski_erg', 'Ski erg', '滑雪機', 'cardio', array['hyrox']),
  ('sled', 'Sled', '雪橇', 'other', array['hyrox']),
  ('smith_machine', 'Smith machine', '史密夫機', 'full_body', '{}'::text[]),
  ('squat_machine', 'Squat machine', '深蹲機', 'leg', '{}'::text[]),
  ('standing_calf_raise_machine', 'Standing calf raise machine', '站姿提踵機', 'leg', '{}'::text[]),
  ('standing_lateral_raise_machine', 'Standing lateral raise machine', '站姿側平舉機', 'shoulder', '{}'::text[]),
  ('stretching_machine', 'Stretching machine', '伸展機', 'other', '{}'::text[]),
  ('swiss_bar', 'Swiss bar', '瑞士槓', 'free_weight', '{}'::text[]),
  ('t_bar_row_machine', 'T-bar row machine', 'T-bar row 機', 'back', '{}'::text[]),
  ('torso_rotation_machine', 'Torso rotation machine', '軀幹旋轉機', 'core', '{}'::text[]),
  ('trap_bar', 'Trap bar', '六角槓', 'free_weight', '{}'::text[]),
  ('treadmill', 'Treadmill', '跑步機', 'cardio', '{}'::text[]),
  ('tricep_extension_machine', 'Tricep extension machine', '三頭伸展機', 'arm', '{}'::text[]),
  ('trx', 'TRX', 'TRX', 'other', '{}'::text[]),
  ('wall_ball', 'Wall ball', '牆球', 'other', '{}'::text[]),
  ('wall_ball_10kg', 'Wall ball 10kg', '牆球 10kg', 'other', '{}'::text[]),
  ('wall_ball_4kg', 'Wall ball 4kg', '牆球 4kg', 'other', array['hyrox']),
  ('wall_ball_6kg', 'Wall ball 6kg', '牆球 6kg', 'other', array['hyrox']),
  ('wall_ball_8kg', 'Wall ball 8kg', '牆球 8kg', 'other', '{}'::text[]),
  ('wall_ball_9kg', 'Wall ball 9kg', '牆球 9kg', 'other', array['hyrox']),
  ('wall_ball_plate_10ft', 'Wall ball target 10ft', '牆球目標板 10ft', 'other', array['hyrox']),
  ('wall_ball_plate_9ft', 'Wall ball target 9ft', '牆球目標板 9ft', 'other', array['hyrox']),
  ('weight_plate', 'Weight plate', '槓片', 'free_weight', '{}'::text[]),
  ('weight_vest', 'Weight vest', '負重背心', 'other', '{}'::text[]),
  ('workout_sandbag', 'Workout sandbag', '訓練沙袋', 'other', '{}'::text[]),
  ('yoga_block', 'Yoga block', '瑜伽磚', 'other', '{}'::text[]),
  ('yoga_mat', 'Yoga mat', '瑜伽墊', 'other', '{}'::text[])
on conflict (code) do update set name_en = excluded.name_en,
  name_zh = excluded.name_zh, category = excluded.category, labels = excluded.labels;

insert into public.gym_equipment_type_inventory (gym_id, equipment_code, is_present)
select id, 'dumbbell', true from public.gyms
where dumbbell_min_weight_kg is not null or dumbbell_max_weight_kg is not null
on conflict (gym_id, equipment_code) do nothing;
insert into public.gym_equipment_type_inventory (gym_id, equipment_code, is_present)
select id, 'weight_plate', true from public.gyms
where plate_min_weight_kg is not null or plate_max_weight_kg is not null
on conflict (gym_id, equipment_code) do nothing;

-- Any custom legacy type keeps its identity and inventory; place it in Other.
update public.equipment_types set category = 'other'
where category not in ('free_weight','cardio','cable','full_body','core','arm','chest','back','shoulder','leg','other');

-- Resolve legacy unlinked models only by canonical code/name/alias matches.
update public.equipment e set equipment_type_code = t.code
from public.equipment_types t
where e.equipment_type_code is null and (
  lower(regexp_replace(e.name, '[^a-zA-Z0-9]+', '_', 'g')) = t.code
  or lower(regexp_replace(e.name, '[^a-zA-Z0-9]+', '_', 'g')) = regexp_replace(t.code, '_machine$', '')
  or lower(e.name) = lower(t.name_en)
  or lower(e.name) = any (select lower(alias) from unnest(t.aliases) alias)
);
update public.equipment set equipment_type_code = 'other_equipment'
where equipment_type_code is null;
alter table public.equipment alter column equipment_type_code set not null;

-- The linked type determines a model's primary category.
update public.equipment e set category_id = c.id
from public.equipment_types t join public.equipment_categories c
  on c.slug = replace(t.category, '_', '-')
where t.code = e.equipment_type_code;
update public.equipment_categories set parent_id = null;
delete from public.equipment_categories
where slug not in ('free-weight','cardio','cable','full-body','core','arm','chest','back','shoulder','leg','other');

alter table public.equipment_categories add constraint equipment_categories_controlled
  check (parent_id is null and slug in ('free-weight','cardio','cable','full-body','core','arm','chest','back','shoulder','leg','other'));
alter table public.equipment_types add constraint equipment_types_controlled_category
  check (category in ('free_weight','cardio','cable','full_body','core','arm','chest','back','shoulder','leg','other'));
alter table public.equipment_types add constraint equipment_types_known_labels
  check (labels <@ array['plate-loaded','selectorized','hyrox'] and array_position(labels, null) is null);
alter table public.equipment add constraint equipment_known_labels
  check (labels <@ array['plate-loaded','selectorized','hyrox'] and array_position(labels, null) is null);

create function public.set_equipment_category_from_type()
returns trigger language plpgsql set search_path = public as $$
begin
  select c.id into new.category_id
  from public.equipment_types t join public.equipment_categories c
    on c.slug = replace(t.category, '_', '-')
  where t.code = new.equipment_type_code and t.is_active;
  if new.category_id is null then raise exception 'Unknown or inactive equipment type'; end if;
  return new;
end;
$$;
create trigger trg_equipment_category_from_type
before insert or update of equipment_type_code, category_id on public.equipment
for each row execute function public.set_equipment_category_from_type();

-- Use the same publication rules even when called by the backend role.
create function public.gym_type_has_public_models(p_gym_id uuid, p_code text)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.gym_equipment_inventory i
    join public.equipment e on e.id = i.equipment_id
    join public.equipment_brands b on b.id = e.brand_id
    join public.equipment_types t on t.code = e.equipment_type_code
    join public.equipment_categories c on c.id = e.category_id
    where i.gym_id = p_gym_id and e.equipment_type_code = p_code
      and i.verified_status in ('admin_verified','owner_verified')
      and e.status = 'active' and b.is_active and c.is_active and t.is_active
  );
$$;

-- A model insert/update/delete and its type summary share one transaction.
-- Lock the gym to serialize simultaneous model changes for that gym.
create function public.sync_gym_model_type(p_gym_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code is null then return; end if;
  perform 1 from public.gyms where id = p_gym_id for no key update;
  if not found then return; end if;
  if exists (
    select 1 from public.gym_equipment_inventory i join public.equipment e on e.id = i.equipment_id
    where i.gym_id = p_gym_id and e.equipment_type_code = p_code
  ) then
    insert into public.gym_equipment_type_inventory
      (gym_id, equipment_code, is_present, quantity, is_directly_reported)
    values (p_gym_id, p_code, true, null, false)
    on conflict (gym_id, equipment_code) do nothing;
  else
    delete from public.gym_equipment_type_inventory
    where gym_id = p_gym_id and equipment_code = p_code and not is_directly_reported;
  end if;
end;
$$;
revoke all on function public.sync_gym_model_type(uuid, text) from public, anon, authenticated;

create function public.sync_gym_model_type_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare old_code text; new_code text;
begin
  if tg_op <> 'INSERT' then
    select equipment_type_code into old_code from public.equipment where id = old.equipment_id;
    perform public.sync_gym_model_type(old.gym_id, old_code);
  end if;
  if tg_op <> 'DELETE' then
    select equipment_type_code into new_code from public.equipment where id = new.equipment_id;
    perform public.sync_gym_model_type(new.gym_id, new_code);
  end if;
  return null;
end;
$$;
create trigger trg_gym_model_type_sync after insert or update or delete
on public.gym_equipment_inventory for each row execute function public.sync_gym_model_type_trigger();

-- Moving a model to a different controlled type moves its derived summaries.
create function public.sync_changed_model_type_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare target record;
begin
  if old.equipment_type_code is distinct from new.equipment_type_code then
    for target in select gym_id from public.gym_equipment_inventory where equipment_id = new.id order by gym_id loop
      perform public.sync_gym_model_type(target.gym_id, old.equipment_type_code);
      perform public.sync_gym_model_type(target.gym_id, new.equipment_type_code);
    end loop;
  end if;
  return null;
end;
$$;
create trigger trg_changed_model_type_sync after update of equipment_type_code
on public.equipment for each row execute function public.sync_changed_model_type_trigger();

-- Remove inventory while the model's type is still available to the sync trigger.
-- A later FK cascade would otherwise lose that type when deleting the model.
create function public.cleanup_deleted_model_inventory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.gym_equipment_inventory where equipment_id = old.id;
  return old;
end;
$$;
create trigger trg_deleted_model_inventory before delete on public.equipment
for each row execute function public.cleanup_deleted_model_inventory();

-- Existing model inventory also gets a summary, without overwriting direct data.
do $$ declare target record; begin
  for target in select distinct i.gym_id, e.equipment_type_code
    from public.gym_equipment_inventory i join public.equipment e on e.id = i.equipment_id
    order by i.gym_id, e.equipment_type_code
  loop perform public.sync_gym_model_type(target.gym_id, target.equipment_type_code); end loop;
end $$;

drop policy "Public can read inventory for active gyms" on public.gym_equipment_type_inventory;
create policy "Public can read inventory for active gyms"
on public.gym_equipment_type_inventory for select to anon, authenticated using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.is_active)
  and (is_directly_reported or public.gym_type_has_public_models(gym_id, equipment_code))
);

-- Direct approved type edits take ownership of an existing derived record.
-- Removing direct data restores a model-derived summary if models remain.
create or replace function public.apply_gym_equipment_type_inventory_items(
  p_target_gym_id uuid, p_inventory_items jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare item jsonb; item_code text; item_present boolean; item_quantity integer;
begin
  if jsonb_typeof(p_inventory_items) is distinct from 'array' then
    raise exception 'inventory_items must be a JSON array';
  end if;
  perform 1 from public.gyms where id = p_target_gym_id for no key update;
  if not found then raise exception 'Gym not found'; end if;
  for item in select value from jsonb_array_elements(p_inventory_items) loop
    item_code := item ->> 'equipmentCode';
    if item_code is null or not exists (
      select 1 from public.equipment_types where code = item_code and is_active
    ) then raise exception 'Unknown or inactive equipment code: %', item_code; end if;
    if coalesce((item ->> 'remove')::boolean, false) then
      delete from public.gym_equipment_type_inventory where gym_id = p_target_gym_id and equipment_code = item_code;
      perform public.sync_gym_model_type(p_target_gym_id, item_code);
      continue;
    end if;
    item_present := (item ->> 'isPresent')::boolean;
    item_quantity := (item ->> 'quantity')::integer;
    if item_present is null and item_quantity is null then
      raise exception 'Inventory item % must contain presence or quantity', item_code;
    end if;
    if item_quantity < 0 then raise exception 'Quantity cannot be negative'; end if;
    if item_quantity is not null then item_present := item_quantity > 0; end if;
    insert into public.gym_equipment_type_inventory
      (gym_id, equipment_code, is_present, quantity, is_directly_reported)
    values (p_target_gym_id, item_code, item_present, item_quantity, true)
    on conflict (gym_id, equipment_code) do update set
      is_present = excluded.is_present, quantity = excluded.quantity,
      is_directly_reported = true, updated_at = now();
  end loop;
end;
$$;
revoke all on function public.apply_gym_equipment_type_inventory_items(uuid, jsonb) from public, anon, authenticated;

-- Search predicates must not expose unverified derived summaries when invoked
-- through a backend client that bypasses RLS.
do $$ declare definition text; begin
  select pg_get_functiondef('public.gym_matches_equipment_requirements(uuid,jsonb)'::regprocedure) into definition;
  definition := replace(definition, 'where inventory.gym_id = target_gym_id',
    'where (inventory.is_directly_reported or public.gym_type_has_public_models(inventory.gym_id, inventory.equipment_code)) and inventory.gym_id = target_gym_id');
  execute definition;
end $$;
notify pgrst, 'reload schema';
