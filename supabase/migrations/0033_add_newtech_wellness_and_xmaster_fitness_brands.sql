insert into public.equipment_brands (slug, name_en, name_zh, country)
values
  ('newtech-wellness', 'Newtech Wellness', 'Newtech Wellness', 'South Korea'),
  ('xmaster-fitness', 'XMaster Fitness', 'XMaster Fitness', 'China')
on conflict (slug) do update
set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  country = excluded.country,
  updated_at = now();
