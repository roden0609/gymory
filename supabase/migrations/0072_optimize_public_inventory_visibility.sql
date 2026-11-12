-- The general search view checks derived presence for every inventory type.
-- Avoid recursively evaluating inventory/equipment/assignment RLS in each check.
-- This definer returns only a public boolean and explicitly enforces every
-- publication condition, including the equipment's PRIMARY type/category.
begin;
create or replace function public.gym_type_has_public_models(p_gym_id uuid, p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gym_equipment_inventory i
    join public.gyms g on g.id = i.gym_id and g.is_active
    join public.equipment e on e.id = i.equipment_id and e.status = 'active'
    join public.equipment_brands b on b.id = e.brand_id and b.is_active
    join public.equipment_type_assignments a on a.equipment_id = e.id and a.equipment_type_code = p_code
    join public.equipment_types t on t.code = a.equipment_type_code and t.is_active
    join public.equipment_categories c on c.slug = replace(t.category, '_', '-') and c.is_active
    join public.equipment_type_assignments primary_assignment on primary_assignment.equipment_id = e.id and primary_assignment.is_primary
    join public.equipment_types primary_type on primary_type.code = primary_assignment.equipment_type_code and primary_type.is_active
    join public.equipment_categories primary_category on primary_category.slug = replace(primary_type.category, '_', '-') and primary_category.is_active
    where i.gym_id = p_gym_id and i.verified_status in ('admin_verified', 'owner_verified')
  );
$$;
revoke all on function public.gym_type_has_public_models(uuid,text) from public, anon, authenticated;
grant execute on function public.gym_type_has_public_models(uuid,text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
