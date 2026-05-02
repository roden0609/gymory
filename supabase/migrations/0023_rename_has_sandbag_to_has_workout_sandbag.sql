-- Clarify that this field tracks workout sandbags, not boxing sandbags.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gyms'
      and column_name = 'has_sandbag'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gyms'
      and column_name = 'has_workout_sandbag'
  ) then
    alter table public.gyms
      rename column has_sandbag to has_workout_sandbag;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gyms'
      and column_name = 'has_workout_sandbag'
  ) then
    alter table public.gyms
      add column has_workout_sandbag boolean;
  end if;
end $$;
