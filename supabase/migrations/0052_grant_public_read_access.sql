-- Public read policies already restrict these tables to publishable rows.
-- Older Supabase projects may have granted all table privileges to API roles,
-- so reset every existing public table/view before applying an explicit
-- read-only allowlist.

do $$
declare
  relation record;
begin
  for relation in
    select namespace.nspname as schema_name, class.relname as relation_name
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      relation.schema_name,
      relation.relation_name
    );
  end loop;
end
$$;

grant select on public.gyms to anon, authenticated;
grant select on public.gyms_normalized to anon, authenticated;
grant select on public.equipment_types to anon, authenticated;
grant select on public.gym_equipment_type_inventory to anon, authenticated;
grant select on public.equipment_brands to anon, authenticated;
grant select on public.gym_brand_inventory to anon, authenticated;
grant select on public.gym_accuracy_votes to anon, authenticated;
grant select on public.equipment_categories to anon, authenticated;
grant select on public.equipment to anon, authenticated;
grant select on public.equipment_aliases to anon, authenticated;
grant select on public.equipment_images to anon, authenticated;
grant select on public.equipment_specs to anon, authenticated;
grant select on public.gym_equipment_inventory to anon, authenticated;

-- Require every future public table to opt in to API access explicitly.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
