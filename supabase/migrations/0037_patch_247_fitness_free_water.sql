update public.gyms
set has_free_water = true
where
  slug like '24-7-fitness-%'
  or website_url like 'https://247.fitness/%'
  or name like '24/7 Fitness %'
  or name_zh like '24/7 Fitness %';
