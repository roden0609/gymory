-- Phase 1: gyms table (single-table MVP)
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists pgcrypto;

create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),

  -- Basic info
  name        text not null,
  slug        text unique not null,
  address     text,
  district    text not null,
  country     text not null default 'Singapore',
  postal_code text,
  website_url     text,
  instagram_url   text,
  contact_phone   text,

  -- Location (upgrade to PostGIS geography in Phase 2)
  lat double precision,
  lng double precision,

  -- Gym size / metadata
  size_category       text check (size_category in ('small', 'medium', 'large')),
  estimated_size_sqft integer check (estimated_size_sqft is null or estimated_size_sqft > 0),
  opening_hours_json  jsonb,
  day_pass_price      numeric check (day_pass_price is null or day_pass_price >= 0),
  is_active           boolean not null default true,
  is_verified         boolean not null default false,

  -- Free weight / racks
  rack_count             integer not null default 0 check (rack_count >= 0),
  bench_count            integer not null default 0 check (bench_count >= 0),
  barbell_count          integer not null default 0 check (barbell_count >= 0),
  dumbbell_max_weight_kg numeric check (dumbbell_max_weight_kg is null or dumbbell_max_weight_kg > 0),
  plate_max_weight_kg    numeric check (plate_max_weight_kg is null or plate_max_weight_kg > 0),

  -- Cardio / conditioning counts
  assault_bike_count integer not null default 0 check (assault_bike_count >= 0),
  ski_erg_count      integer not null default 0 check (ski_erg_count >= 0),
  rower_count        integer not null default 0 check (rower_count >= 0),
  sled_count         integer not null default 0 check (sled_count >= 0),
  treadmill_count    integer not null default 0 check (treadmill_count >= 0),

  -- Strength machine counts
  cable_machine_count integer not null default 0 check (cable_machine_count >= 0),
  lat_pulldown_count  integer not null default 0 check (lat_pulldown_count >= 0),
  chest_press_count   integer not null default 0 check (chest_press_count >= 0),
  leg_press_count     integer not null default 0 check (leg_press_count >= 0),
  hack_squat_count    integer not null default 0 check (hack_squat_count >= 0),

  -- Boolean equipment / features
  has_smith_machine       boolean not null default false,
  has_deadlift_platform   boolean not null default false,
  has_pull_up_bar         boolean not null default false,
  has_dip_station         boolean not null default false,
  has_trx                 boolean not null default false,
  has_resistance_band     boolean not null default false,
  has_battle_ropes        boolean not null default false,
  has_rings               boolean not null default false,
  has_glute_ham_developer boolean not null default false,
  has_reverse_hyper       boolean not null default false,
  has_farmers_handles     boolean not null default false,

  -- Flexible tags for niche / accessories (e.g. trap_bar, safety_squat_bar)
  equipment_tags  text[] not null default '{}',
  equipment_notes text,

  -- Trust / freshness
  data_source                text check (data_source in ('admin', 'owner', 'user_submission', 'import')),
  equipment_last_verified_at timestamptz,
  last_reported_at           timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_gyms_updated_at
  before update on gyms
  for each row execute function set_updated_at();
