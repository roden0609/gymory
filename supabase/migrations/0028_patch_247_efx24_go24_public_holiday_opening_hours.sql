update public.gyms
set opening_hours_json = coalesce(opening_hours_json, '{}'::jsonb) || jsonb_build_object(
  'public_holidays', '00:00-24:00'
)
where
  slug like '24-7-fitness-%'
  or slug like 'efx24-%'
  or slug like 'go24-fitness-%'
  or website_url like 'https://247.fitness/%'
  or website_url like 'https://efx24.com/%'
  or website_url like 'https://www.go24fitness.com/%';
