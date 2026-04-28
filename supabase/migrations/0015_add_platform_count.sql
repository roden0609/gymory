alter table public.gyms
  add column if not exists platform_count integer check (platform_count >= 0);
