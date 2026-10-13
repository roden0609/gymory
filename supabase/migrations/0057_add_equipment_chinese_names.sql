-- Optional Chinese names for concrete equipment models.
-- Keep the existing name as the canonical name and leave untranslated rows null.
alter table public.equipment
  add column if not exists name_zh text;

comment on column public.equipment.name_zh is
  'Optional Traditional Chinese equipment name.';
