-- Add functional training after Leg and before Other.
alter table public.equipment_categories drop constraint equipment_categories_controlled;
alter table public.equipment_categories add constraint equipment_categories_controlled
  check (parent_id is null and slug in ('free-weight','cardio','cable','full-body','core','arm','chest','back','shoulder','leg','functional-training','other'));
alter table public.equipment_types drop constraint equipment_types_controlled_category;
alter table public.equipment_types add constraint equipment_types_controlled_category
  check (category in ('free_weight','cardio','cable','full_body','core','arm','chest','back','shoulder','leg','functional_training','other'));

insert into public.equipment_categories (slug, name, name_zh, sort_order, parent_id, is_active)
values ('functional-training', 'Functional training', '功能性訓練', 110, null, true)
on conflict (slug) do update set name = excluded.name, name_zh = excluded.name_zh,
  sort_order = excluded.sort_order, parent_id = null, is_active = true;
update public.equipment_categories set sort_order = 120 where slug = 'other';

update public.equipment_types set category = 'functional_training'
where code in (
  'workout_sandbag', 'sandbag_5kg', 'sandbag_10kg', 'sandbag_15kg',
  'sandbag_20kg', 'sandbag_25kg', 'sandbag_30kg',
  'wall_ball', 'wall_ball_4kg', 'wall_ball_6kg', 'wall_ball_8kg',
  'wall_ball_9kg', 'wall_ball_10kg', 'wall_ball_plate_9ft', 'wall_ball_plate_10ft',
  'medicine_ball', 'sled', 'battle_rope', 'plyo_box', 'trx', 'rings',
  'resistance_band', 'balance_ball', 'exercise_stepper'
);
update public.equipment_types set category = 'core' where code = 'ab_roller';
update public.equipment_types set category = 'back' where code = 'roman_chair';
update public.equipment_types set category = 'leg'
where code in ('glute_ham_developer', 'reverse_hyper');

-- Keep catalog models aligned with their linked types.
update public.equipment e set category_id = c.id
from public.equipment_types t join public.equipment_categories c
  on c.slug = replace(t.category, '_', '-')
where t.code = e.equipment_type_code and e.category_id is distinct from c.id;
