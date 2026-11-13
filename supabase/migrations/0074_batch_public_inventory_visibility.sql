-- Same publication rules as 0072; expose only already-public gym/type keys.
-- No equipment provenance or assignment source is returned. Keep RLS active.
begin;
-- Compute the approved model/type pairs once per statement, rather than an
-- EXISTS with repeated joins for every derived inventory row.
create function public.public_gym_model_types()
returns table (gym_id uuid, equipment_code text)
language sql stable security definer set search_path = '' as $$
  select distinct i.gym_id, a.equipment_type_code
  from public.gym_equipment_inventory i
  join public.gyms g on g.id = i.gym_id and g.is_active
  join public.equipment e on e.id = i.equipment_id and e.status = 'active'
  join public.equipment_brands b on b.id = e.brand_id and b.is_active
  join public.equipment_type_assignments a on a.equipment_id = e.id
  join public.equipment_types t on t.code = a.equipment_type_code and t.is_active
  join public.equipment_categories c on c.slug = replace(t.category, '_', '-') and c.is_active
  join public.equipment_type_assignments primary_assignment on primary_assignment.equipment_id = e.id and primary_assignment.is_primary
  join public.equipment_types primary_type on primary_type.code = primary_assignment.equipment_type_code and primary_type.is_active
  join public.equipment_categories primary_category on primary_category.slug = replace(primary_type.category, '_', '-') and primary_category.is_active
  where i.verified_status in ('admin_verified', 'owner_verified');
$$;
revoke all on function public.public_gym_model_types() from public, anon, authenticated;
grant execute on function public.public_gym_model_types() to anon, authenticated, service_role;
drop policy "Public can read inventory for active gyms" on public.gym_equipment_type_inventory;
create policy "Public can read inventory for active gyms"
on public.gym_equipment_type_inventory for select to anon, authenticated using (
  exists (select 1 from public.gyms g where g.id = gym_equipment_type_inventory.gym_id and g.is_active)
  and (is_directly_reported or (gym_id, equipment_code) in (
    select visible.gym_id, visible.equipment_code from public.public_gym_model_types() visible
  ))
);

notify pgrst, 'reload schema';
commit;
