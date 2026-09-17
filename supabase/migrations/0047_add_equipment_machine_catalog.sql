-- Add the brand/model equipment catalog alongside the existing generic
-- equipment_types and gym_equipment_type_inventory tables.

-- 0043 originally introduced the generic inventory under the shorter name.
-- Rename it before that name is reused for concrete catalog equipment.
alter table public.gym_equipment_inventory
  rename to gym_equipment_type_inventory;

alter table public.gym_equipment_type_inventory
  rename constraint gym_equipment_inventory_pkey
  to gym_equipment_type_inventory_pkey;
alter table public.gym_equipment_type_inventory
  rename constraint gym_equipment_inventory_gym_id_equipment_code_key
  to gym_equipment_type_inventory_gym_id_equipment_code_key;
alter table public.gym_equipment_type_inventory
  rename constraint gym_equipment_inventory_quantity_nonnegative
  to gym_equipment_type_inventory_quantity_nonnegative;
alter table public.gym_equipment_type_inventory
  rename constraint gym_equipment_inventory_has_value
  to gym_equipment_type_inventory_has_value;
alter table public.gym_equipment_type_inventory
  rename constraint gym_equipment_inventory_value_consistency
  to gym_equipment_type_inventory_value_consistency;

alter index public.idx_gym_equipment_inventory_gym_id
  rename to idx_gym_equipment_type_inventory_gym_id;
alter index public.idx_gym_equipment_inventory_equipment_gym
  rename to idx_gym_equipment_type_inventory_equipment_gym;
alter index public.idx_gym_equipment_inventory_present
  rename to idx_gym_equipment_type_inventory_present;

alter trigger trg_gym_equipment_inventory_updated_at
  on public.gym_equipment_type_inventory
  rename to trg_gym_equipment_type_inventory_updated_at;

-- Recreate dependent PL/pgSQL functions with the renamed table. Function
-- names containing gym_equipment_inventory are renamed at the same time so
-- they cannot be confused with concrete equipment inventory operations.
do $$
declare
  function_definition text;
begin
  for function_definition in
    select pg_get_functiondef(proc.oid)
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.prokind in ('f', 'p')
      and pg_get_functiondef(proc.oid) like '%gym_equipment_inventory%'
  loop
    execute replace(
      function_definition,
      'gym_equipment_inventory',
      'gym_equipment_type_inventory'
    );
  end loop;
end
$$;

drop function public.apply_gym_equipment_inventory_patch(
  uuid,
  jsonb,
  uuid,
  uuid,
  jsonb
);
drop function public.apply_gym_equipment_inventory_items(uuid, jsonb);

revoke execute on function public.apply_gym_equipment_type_inventory_items(
  uuid,
  jsonb
) from public, anon, authenticated;
revoke execute on function public.apply_gym_equipment_type_inventory_patch(
  uuid,
  jsonb,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
grant execute on function public.apply_gym_equipment_type_inventory_patch(
  uuid,
  jsonb,
  uuid,
  uuid,
  jsonb
) to service_role;

alter table public.equipment_brands
  add column if not exists website_url text,
  add column if not exists source_url text,
  add column if not exists source_synced_at timestamptz,
  add column if not exists notes text;

create table if not exists public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.equipment_categories(id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_categories_parent_is_different
    check (parent_id is null or parent_id <> id)
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.equipment_brands(id) on delete restrict,
  category_id uuid not null references public.equipment_categories(id) on delete restrict,
  equipment_type_code text references public.equipment_types(code) on delete restrict,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  series text,
  model_number text,
  product_url text,
  description text,
  status text not null default 'unknown'
    check (status in ('active', 'discontinued', 'unknown')),
  source_type text not null
    check (source_type in ('official', 'manual', 'user_submitted')),
  import_method text
    check (import_method is null or import_method in ('crawler', 'seed', 'admin')),
  source_url text,
  source_external_id text,
  imported_at timestamptz,
  source_synced_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create unique index if not exists idx_equipment_brand_external_id
  on public.equipment(brand_id, source_external_id)
  where source_external_id is not null;

create index if not exists idx_equipment_category
  on public.equipment(category_id);

create index if not exists idx_equipment_equipment_type
  on public.equipment(equipment_type_code)
  where equipment_type_code is not null;

create index if not exists idx_equipment_name_search
  on public.equipment using gin (to_tsvector('simple', name));

create table if not exists public.equipment_aliases (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  alias text not null check (btrim(alias) <> ''),
  locale text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_equipment_aliases_unique
  on public.equipment_aliases(
    equipment_id,
    lower(alias),
    coalesce(locale, '')
  );

create index if not exists idx_equipment_aliases_search
  on public.equipment_aliases using gin (to_tsvector('simple', alias));

create table if not exists public.equipment_images (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  url text not null,
  source_url text,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  source_type text not null
    check (source_type in ('official', 'manual', 'user_submitted')),
  source_external_key text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_id, url)
);

create unique index if not exists idx_equipment_images_one_primary
  on public.equipment_images(equipment_id)
  where is_primary is true;

create index if not exists idx_equipment_images_display
  on public.equipment_images(equipment_id, sort_order, created_at);

create table if not exists public.equipment_specs (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  spec_key text not null check (spec_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  value_text text,
  value_number numeric,
  unit text,
  sort_order integer not null default 0,
  source_url text,
  source_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_id, spec_key),
  constraint equipment_specs_has_value
    check (value_text is not null or value_number is not null)
);

create index if not exists idx_equipment_specs_display
  on public.equipment_specs(equipment_id, sort_order, spec_key);

create table if not exists public.gym_equipment_inventory (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  quantity integer check (quantity is null or quantity > 0),
  condition text
    check (condition is null or condition in ('good', 'fair', 'poor', 'unknown')),
  notes text,
  verified_status text not null default 'unverified'
    check (verified_status in (
      'unverified',
      'community_verified',
      'owner_verified',
      'admin_verified'
    )),
  confidence_score integer
    check (confidence_score is null or confidence_score between 0 and 100),
  source text not null check (source in ('admin', 'owner', 'user', 'import')),
  added_by_user_id uuid references public.users(id) on delete set null,
  verified_by_user_id uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, equipment_id),
  constraint gym_equipment_inventory_verification_metadata
    check (
      verified_status in ('unverified', 'community_verified')
      or verified_at is not null
    )
);

create index if not exists idx_gym_equipment_inventory_gym
  on public.gym_equipment_inventory(gym_id);

create index if not exists idx_gym_equipment_inventory_equipment_public
  on public.gym_equipment_inventory(equipment_id, gym_id)
  where verified_status in ('admin_verified', 'owner_verified');

create or replace function public.prevent_equipment_category_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if exists (
    with recursive ancestors as (
      select id, parent_id
      from public.equipment_categories
      where id = new.parent_id

      union all

      select parent.id, parent.parent_id
      from public.equipment_categories parent
      join ancestors child on parent.id = child.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Equipment category hierarchy cannot contain a cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipment_categories_prevent_cycle
  on public.equipment_categories;
create trigger trg_equipment_categories_prevent_cycle
  before insert or update on public.equipment_categories
  for each row execute function public.prevent_equipment_category_cycle();

drop trigger if exists trg_equipment_categories_updated_at
  on public.equipment_categories;
create trigger trg_equipment_categories_updated_at
  before update on public.equipment_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_equipment_updated_at
  on public.equipment;
create trigger trg_equipment_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

drop trigger if exists trg_equipment_images_updated_at
  on public.equipment_images;
create trigger trg_equipment_images_updated_at
  before update on public.equipment_images
  for each row execute function public.set_updated_at();

drop trigger if exists trg_equipment_specs_updated_at
  on public.equipment_specs;
create trigger trg_equipment_specs_updated_at
  before update on public.equipment_specs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_gym_equipment_inventory_updated_at
  on public.gym_equipment_inventory;
create trigger trg_gym_equipment_inventory_updated_at
  before update on public.gym_equipment_inventory
  for each row execute function public.set_updated_at();

alter table public.equipment_categories enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_aliases enable row level security;
alter table public.equipment_images enable row level security;
alter table public.equipment_specs enable row level security;
alter table public.gym_equipment_inventory enable row level security;

create policy "Public can read active equipment categories"
on public.equipment_categories
for select
to anon, authenticated
using (is_active is true);

create policy "Public can read active equipment machines"
on public.equipment
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.equipment_brands brand
    where brand.id = equipment.brand_id
      and brand.is_active is true
  )
  and exists (
    select 1 from public.equipment_categories category
    where category.id = equipment.category_id
      and category.is_active is true
  )
);

create policy "Public can read aliases for active machines"
on public.equipment_aliases
for select
to anon, authenticated
using (
  exists (
    select 1 from public.equipment machine
    where machine.id = equipment_aliases.equipment_id
  )
);

create policy "Public can read images for active machines"
on public.equipment_images
for select
to anon, authenticated
using (
  exists (
    select 1 from public.equipment machine
    where machine.id = equipment_images.equipment_id
  )
);

create policy "Public can read specs for active machines"
on public.equipment_specs
for select
to anon, authenticated
using (
  exists (
    select 1 from public.equipment machine
    where machine.id = equipment_specs.equipment_id
  )
);

create policy "Public can read verified model inventory for active gyms"
on public.gym_equipment_inventory
for select
to anon, authenticated
using (
  verified_status in ('admin_verified', 'owner_verified')
  and exists (
    select 1 from public.gyms gym
    where gym.id = gym_equipment_inventory.gym_id
      and gym.is_active is true
  )
  and exists (
    select 1 from public.equipment machine
    where machine.id = gym_equipment_inventory.equipment_id
  )
);

-- Older Supabase projects may grant every table privilege to API roles by
-- default. Reset these ACLs before exposing only the RLS-protected reads.
revoke all privileges on public.equipment_categories from anon, authenticated;
revoke all privileges on public.equipment from anon, authenticated;
revoke all privileges on public.equipment_aliases from anon, authenticated;
revoke all privileges on public.equipment_images from anon, authenticated;
revoke all privileges on public.equipment_specs from anon, authenticated;
revoke all privileges on public.gym_equipment_inventory from anon, authenticated;

grant select on public.equipment_categories to anon, authenticated;
grant select on public.equipment to anon, authenticated;
grant select on public.equipment_aliases to anon, authenticated;
grant select on public.equipment_images to anon, authenticated;
grant select on public.equipment_specs to anon, authenticated;
grant select on public.gym_equipment_inventory to anon, authenticated;

insert into public.equipment_categories (name, slug, sort_order)
values
  ('Strength', 'strength', 10),
  ('Cardio', 'cardio', 20),
  ('Free Weights', 'free-weights', 30),
  ('Functional Training', 'functional-training', 40),
  ('Recovery', 'recovery', 50)
on conflict (slug) do nothing;

insert into public.equipment_categories (parent_id, name, slug, sort_order)
select parent.id, child.name, child.slug, child.sort_order
from (
  values
    ('Plate Loaded', 'plate-loaded', 10),
    ('Selectorized', 'selectorized', 20),
    ('Cable', 'cable', 30)
) as child(name, slug, sort_order)
cross join public.equipment_categories parent
where parent.slug = 'strength'
on conflict (slug) do nothing;
