alter table public.gyms
  add column if not exists has_hack_squat boolean;

update public.gyms
set has_hack_squat = case
  when hack_squat_count > 0 then true
  when hack_squat_count = 0 then false
  else null
end
where has_hack_squat is null;

alter table public.gyms
  drop column if exists hack_squat_count;
