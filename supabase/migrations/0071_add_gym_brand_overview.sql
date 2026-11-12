-- Brand overviews need only three inventory types. The general gyms_public view
-- aggregates every type and runs the model-visibility RLS helper for each row.
-- Keep a separate projection so this consumer does not pay that full cost.
begin;
create view public.gym_brand_overview_public with (security_invoker = true) as
select g.slug, g.district_code, g.is_active, g.dumbbell_max_weight_kg,
  g.has_bathroom, g.has_changing_room, g.has_free_water,
  ((inventory.items -> 'rack') ->> 'quantity')::integer as rack_count,
  ((inventory.items -> 'treadmill') ->> 'quantity')::integer as treadmill_count,
  ((inventory.items -> 'rower') ->> 'quantity')::integer as rower_count
from public.gyms g
left join lateral (
  select jsonb_object_agg(i.equipment_code, jsonb_build_object('quantity', i.quantity)) as items
  from public.gym_equipment_type_inventory i
  where i.gym_id = g.id and i.equipment_code in ('rack', 'treadmill', 'rower')
) inventory on true;
revoke all on public.gym_brand_overview_public from public, anon, authenticated;
grant select (slug, district_code, is_active, dumbbell_max_weight_kg,
  has_bathroom, has_changing_room, has_free_water, rack_count, treadmill_count, rower_count)
on public.gym_brand_overview_public to anon, authenticated;
grant select on public.gym_brand_overview_public to service_role;
notify pgrst, 'reload schema';
commit;
