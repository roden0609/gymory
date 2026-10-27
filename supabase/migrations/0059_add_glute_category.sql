-- Add Glute after Leg, preserving the existing controlled taxonomy.
alter table public.equipment_categories drop constraint equipment_categories_controlled;
alter table public.equipment_categories add constraint equipment_categories_controlled
  check (parent_id is null and slug in (
    'free-weight','cardio','cable','full-body','core','arm','chest','back',
    'shoulder','leg','glute','functional-training','other'
  ));

alter table public.equipment_types drop constraint equipment_types_controlled_category;
alter table public.equipment_types add constraint equipment_types_controlled_category
  check (category in (
    'free_weight','cardio','cable','full_body','core','arm','chest','back',
    'shoulder','leg','glute','functional_training','other'
  ));

insert into public.equipment_categories (slug, name, name_zh, sort_order, parent_id, is_active)
values ('glute', 'Glute', '臀部', 110, null, true)
on conflict (slug) do update set
  name = excluded.name, name_zh = excluded.name_zh,
  sort_order = excluded.sort_order, parent_id = null, is_active = true;

update public.equipment_categories set sort_order = 120 where slug = 'functional-training';
update public.equipment_categories set sort_order = 130 where slug = 'other';

-- Only move the two existing glute-focused types. Leg press, squat, adductor,
-- GHD and reverse hyper retain their existing classifications.
-- 0058's trg_equipment_type_category_sync updates each linked model's
-- category_id in the same transaction. Inventory and verification are untouched.
update public.equipment_types set category = 'glute'
where code in ('hip_thrust_machine', 'hip_abductor_machine')
  and category is distinct from 'glute';
