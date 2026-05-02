update public.gyms
set
  has_washroom = true,
  has_bathroom = true
where
  slug like '24-7-fitness-%'
  or slug like 'go24-fitness-%'
  or slug like 'efx24-%'
  or slug like 'lcsd-%'
  or website_url like 'https://247.fitness/%'
  or website_url like 'https://www.go24fitness.com/%'
  or website_url like 'https://efx24.com/%'
  or website_url like 'https://www.lcsd.gov.hk/%';
