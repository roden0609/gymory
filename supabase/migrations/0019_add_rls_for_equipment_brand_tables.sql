-- Expose equipment brand data to public readers in a controlled way.
-- Gym detail pages load these tables using the publishable key, so they must
-- have explicit SELECT policies under RLS.

alter table public.equipment_brands enable row level security;
alter table public.gym_brand_inventory enable row level security;

drop policy if exists "Public can read active equipment brands" on public.equipment_brands;
create policy "Public can read active equipment brands"
on public.equipment_brands
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read gym brand inventory for active gyms" on public.gym_brand_inventory;
create policy "Public can read gym brand inventory for active gyms"
on public.gym_brand_inventory
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.gyms g
    where g.id = gym_brand_inventory.gym_id
      and g.is_active = true
  )
);
