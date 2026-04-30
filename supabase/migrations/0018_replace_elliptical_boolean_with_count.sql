alter table public.gyms
  add column if not exists elliptical_machine_count integer;

update public.gyms
set elliptical_machine_count = case
  when has_elliptical_machine is true then 1
  when has_elliptical_machine is false then 0
  else null
end
where elliptical_machine_count is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gyms_elliptical_machine_count_nonnegative'
  ) then
    alter table public.gyms
      add constraint gyms_elliptical_machine_count_nonnegative
      check (elliptical_machine_count is null or elliptical_machine_count >= 0);
  end if;
end $$;

alter table public.gyms
  drop column if exists has_elliptical_machine;
