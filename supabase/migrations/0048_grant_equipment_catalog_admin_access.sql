-- RLS bypass does not replace PostgreSQL table privileges. Grant the backend
-- service role explicit catalog access for authenticated admin workflows.

grant select, insert, update, delete on public.equipment_brands to service_role;
grant select, insert, update, delete on public.equipment_categories to service_role;
grant select, insert, update, delete on public.equipment to service_role;
grant select, insert, update, delete on public.equipment_aliases to service_role;
grant select, insert, update, delete on public.equipment_images to service_role;
grant select, insert, update, delete on public.equipment_specs to service_role;
grant select, insert, update, delete on public.gym_equipment_inventory to service_role;

grant select on public.equipment_types to service_role;
