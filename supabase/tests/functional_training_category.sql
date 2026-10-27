-- Run after 0056 with psql -v ON_ERROR_STOP=1 -f this file.
begin;
do $$
begin
  if (select count(*) from public.equipment_categories) <> 13 then
    raise exception 'Expected thirteen equipment categories';
  end if;
  if not exists (
    select 1 from public.equipment_categories f
    join public.equipment_categories l on l.slug = 'leg'
    join public.equipment_categories o on o.slug = 'other'
    where f.slug = 'functional-training' and f.is_active
      and f.name_zh = '功能性訓練' and l.sort_order < f.sort_order and f.sort_order < o.sort_order
  ) then raise exception 'Functional training must follow Leg and precede Other'; end if;
  if (select count(*) from public.equipment_types where category = 'functional_training') <> 24
    or exists (select 1 from public.equipment_types
      where (code = 'wall_ball' or parent_code = 'wall_ball'
        or code = 'workout_sandbag' or parent_code = 'workout_sandbag')
        and category <> 'functional_training') then
    raise exception 'Functional training types were not reassigned correctly';
  end if;
  if exists (select 1 from public.equipment_types
    where (code = 'ab_roller' and category <> 'core')
       or (code = 'roman_chair' and category <> 'back')
       or (code in ('glute_ham_developer', 'reverse_hyper') and category <> 'leg')
       or ((code = 'kettlebell' or parent_code = 'kettlebell') and category <> 'free_weight')
       or (code = 'boxing_sandbag' and category <> 'other')) then
    raise exception 'Equipment categories do not match the agreed assignments';
  end if;
  if exists (select 1 from public.equipment e
    join public.equipment_types t on t.code = e.equipment_type_code
    join public.equipment_categories c on c.id = e.category_id
    where c.slug <> replace(t.category, '_', '-')) then
    raise exception 'Model category must match its linked type';
  end if;
end $$;
rollback;
