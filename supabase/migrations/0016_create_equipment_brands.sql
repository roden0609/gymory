create table if not exists public.equipment_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_zh text,
  country text,
  is_active boolean not null default true,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_brand_inventory (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  brand_id uuid not null references public.equipment_brands(id) on delete cascade,
  equipment_types text[] not null default '{}',
  confidence text not null default 'reported' check (confidence in ('reported', 'confirmed')),
  source_submission_id uuid references public.gym_update_submissions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, brand_id)
);

create index if not exists idx_gym_brand_inventory_gym_id on public.gym_brand_inventory(gym_id);
create index if not exists idx_gym_brand_inventory_brand_id on public.gym_brand_inventory(brand_id);

insert into public.equipment_brands (slug, name_en, name_zh, country)
values
  ('technogym', 'Technogym', 'Technogym', 'Italy'),
  ('life-fitness', 'Life Fitness', 'Life Fitness', 'United States'),
  ('precor', 'Precor', 'Precor', 'United States'),
  ('matrix-fitness', 'Matrix Fitness', 'Matrix Fitness', 'Taiwan'),
  ('hammer-strength', 'Hammer Strength', 'Hammer Strength', 'United States'),
  ('rogue-fitness', 'Rogue Fitness', 'Rogue Fitness', 'United States'),
  ('eleiko', 'Eleiko', 'Eleiko', 'Sweden'),
  ('ivanko', 'Ivanko', 'Ivanko', 'United States'),
  ('panatta', 'Panatta', 'Panatta', 'Italy'),
  ('cybex', 'Cybex', 'Cybex', 'United States'),
  ('nautilus', 'Nautilus', 'Nautilus', 'United States'),
  ('hoist-fitness', 'Hoist Fitness', 'Hoist Fitness', 'United States'),
  ('woodway', 'Woodway', 'Woodway', 'United States'),
  ('assault-fitness', 'Assault Fitness', 'Assault Fitness', 'United States'),
  ('concept2', 'Concept2', 'Concept2', 'United States'),
  ('schwinn', 'Schwinn', 'Schwinn', 'United States'),
  ('again-faster', 'Again Faster', 'Again Faster', 'United States'),
  ('trx', 'TRX', 'TRX', 'United States'),
  ('escape-fitness', 'Escape Fitness', 'Escape Fitness', 'United Kingdom'),
  ('harbinger', 'Harbinger', 'Harbinger', 'United States'),
  ('schiek', 'Schiek', 'Schiek', 'United States'),
  ('bear-komplex', 'Bear KompleX', 'Bear KompleX', 'United States'),
  ('gymreapers', 'Gymreapers', 'Gymreapers', 'United States'),
  ('impulse-fitness', 'Impulse Fitness', 'Impulse Fitness', 'China'),
  ('dhz-fitness', 'DHZ Fitness', 'DHZ Fitness', 'China'),
  ('shua-fitness', 'Shua Fitness', 'Shua Fitness', 'China'),
  ('luxiaojun-fitness', 'LUXIAOJUN Fitness', 'LUXIAOJUN Fitness', 'China')
on conflict (slug) do update
set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  country = excluded.country,
  updated_at = now();
