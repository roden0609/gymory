alter table public.equipment_categories
  add column if not exists name_zh text;

update public.equipment_categories
set name_zh = translations.name_zh
from (values
  ('strength', '力量訓練'),
  ('cardio', '帶氧運動'),
  ('free-weights', '自由重量'),
  ('functional-training', '功能性訓練'),
  ('recovery', '恢復'),
  ('plate-loaded', '槓片式器械'),
  ('selectorized', '插片式器械'),
  ('cable', '滑輪器械')
) as translations(slug, name_zh)
where public.equipment_categories.slug = translations.slug
  and public.equipment_categories.name_zh is null;
