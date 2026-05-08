-- Booty Builder is an equipment brand, not a gym-level machine boolean.

alter table public.gyms
  drop column if exists has_booty_builder;

insert into public.equipment_brands (slug, name_en, name_zh, country)
values
  ('booty-builder', 'Booty Builder', 'Booty Builder', 'Norway')
on conflict (slug) do update
set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  country = excluded.country,
  updated_at = now();
