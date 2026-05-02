alter table public.gyms
  add column if not exists has_boxing_sandbag boolean;

insert into public.equipment_brands (slug, name_en, name_zh, country)
values
  ('sportsart', 'SportsArt', 'SportsArt', null)
on conflict (slug) do update
set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  country = excluded.country,
  updated_at = now();
