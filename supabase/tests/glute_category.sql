-- Run after 0059: psql -v ON_ERROR_STOP=1 -f supabase/tests/glute_category.sql
begin;
do $$
begin
  if not exists (
    select 1 from public.equipment_categories g
    join public.equipment_categories l on l.slug = 'leg'
    join public.equipment_categories f on f.slug = 'functional-training'
    join public.equipment_categories o on o.slug = 'other'
    where g.slug = 'glute' and g.name = 'Glute' and g.name_zh = '臀部'
      and g.is_active and g.parent_id is null
      and l.sort_order < g.sort_order and g.sort_order < f.sort_order
      and f.sort_order < o.sort_order
  ) then raise exception 'Expected active bilingual Glute category between Leg and Functional training'; end if;

  if (select count(*) from public.equipment_types
      where code in ('hip_thrust_machine', 'hip_abductor_machine') and category = 'glute') <> 2 then
    raise exception 'Hip thrust and hip abductor types must be classified as Glute';
  end if;

  if exists (
    select 1 from public.equipment e
    join public.equipment_types t on t.code = e.equipment_type_code
    join public.equipment_categories c on c.id = e.category_id
    where t.code in ('hip_thrust_machine', 'hip_abductor_machine') and c.slug <> 'glute'
  ) then raise exception 'Linked models must inherit Glute from their type'; end if;

  -- Exercise both expanded constraints and the type-to-model category trigger.
  update public.equipment_types set category = 'leg' where code = 'hip_thrust_machine';
  update public.equipment_types set category = 'glute' where code = 'hip_thrust_machine';
  if exists (
    select 1 from public.equipment e join public.equipment_categories c on c.id = e.category_id
    where e.equipment_type_code = 'hip_thrust_machine' and c.slug <> 'glute'
  ) then raise exception 'Changing type category must keep linked models aligned'; end if;
end $$;
rollback;
