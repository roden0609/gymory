-- Run after 0067. Transactional fixtures and schema changes are rolled back.
begin;

insert into public.gyms (id, name, slug, district_code, is_active)
values ('00000000-0067-4000-8000-000000000001', 'Public permission fixture', 'public-permission-fixture-0067', 'HK-YTM', true),
       ('00000000-0067-4000-8000-000000000002', 'Private permission fixture', 'private-permission-fixture-0067', 'HK-YTM', false);

-- A newly added internal column must not inherit public SELECT.
alter table public.gyms add column frontend_acl_future_private text;

do $$
declare api_role text; relation_name text; column_name text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    foreach relation_name in array array[
      'gyms', 'gyms_public', 'equipment_types', 'gym_equipment_type_inventory',
      'equipment_brands', 'gym_brand_inventory', 'gym_accuracy_votes',
      'equipment_categories', 'equipment', 'equipment_aliases', 'equipment_images',
      'gym_equipment_inventory', 'equipment_type_assignments', 'equipment_specs'
    ] loop
      if has_table_privilege(api_role, 'public.' || relation_name, 'SELECT') then
        raise exception '% still has table-wide SELECT on %', api_role, relation_name;
      end if;
      if has_any_column_privilege(api_role, 'public.' || relation_name, 'INSERT,UPDATE,REFERENCES')
        or has_table_privilege(api_role, 'public.' || relation_name, 'DELETE,TRUNCATE,TRIGGER') then
        raise exception '% has unexpected write privileges on %', api_role, relation_name;
      end if;
    end loop;
    foreach column_name in array array['official_review_note', 'official_verified_by', 'source_external_id', 'captured_name'] loop
      if has_column_privilege(api_role, 'public.equipment', column_name, 'SELECT') then
        raise exception '% can read internal equipment column %', api_role, column_name;
      end if;
    end loop;
    foreach column_name in array array['hyrox_partner_id', 'hyrox_source_url', 'hyrox_source_synced_at', 'last_reported_at', 'created_at', 'data_accuracy_flagged_at'] loop
      if has_column_privilege(api_role, 'public.gyms', column_name, 'SELECT')
        or has_column_privilege(api_role, 'public.gyms_normalized', column_name, 'SELECT') then
        raise exception '% can read internal gym column %', api_role, column_name;
      end if;
    end loop;
    if has_column_privilege(api_role, 'public.gyms', 'frontend_acl_future_private', 'SELECT')
      or has_column_privilege(api_role, 'public.gym_accuracy_votes', 'user_id', 'SELECT')
      or has_any_column_privilege(api_role, 'public.equipment_specs', 'SELECT')
      or has_any_column_privilege(api_role, 'public.users', 'SELECT')
      or has_any_column_privilege(api_role, 'public.gyms_normalized', 'SELECT') then
      raise exception '% can read backend-only data', api_role;
    end if;
  end loop;
  if not has_table_privilege('service_role', 'public.equipment', 'SELECT')
    or not has_table_privilege('service_role', 'public.equipment', 'UPDATE') then
    raise exception 'Backend equipment access was removed';
  end if;
end $$;

-- Test real SELECT execution, not just ACL metadata, for both API roles.
-- Every allowed column is exercised; this also resolves view/RLS dependencies.
create function pg_temp.assert_frontend_reads() returns void language plpgsql as $$
declare relation_name text; column_list text; visible_count integer;
begin
  foreach relation_name in array array[
    'gyms', 'gyms_public', 'equipment_types', 'gym_equipment_type_inventory',
    'equipment_brands', 'gym_brand_inventory', 'gym_accuracy_votes',
    'equipment_categories', 'equipment', 'equipment_aliases', 'equipment_images',
    'gym_equipment_inventory', 'equipment_type_assignments'
  ] loop
    select string_agg(format('%I', a.attname), ', ' order by a.attnum)
      into column_list from pg_attribute a
      where a.attrelid = format('public.%I', relation_name)::regclass
        and a.attnum > 0 and not a.attisdropped
        and has_column_privilege(current_user, a.attrelid, a.attnum, 'SELECT');
    if column_list is null then raise exception 'Missing allowed columns for %', relation_name; end if;
    execute format('select %s from public.%I limit 1', column_list, relation_name);
    if relation_name <> 'gyms_public' then
      begin
        execute format('select * from public.%I limit 0', relation_name);
        raise exception 'SELECT * unexpectedly allowed on %', relation_name;
      exception when insufficient_privilege then null;
      end;
    end if;
  end loop;
  select count(*) into visible_count from public.gyms_public
    where id in ('00000000-0067-4000-8000-000000000001', '00000000-0067-4000-8000-000000000002');
  if visible_count <> 1 then raise exception 'Active gym RLS failed: % rows', visible_count; end if;
  begin
    perform official_review_note from public.equipment limit 0;
    raise exception 'Internal equipment notes unexpectedly readable';
  exception when insufficient_privilege then null;
  end;
  -- Equivalent relational dependencies to PostgREST's nested detail query.
  perform i.quantity, e.name, b.name_en, im.storage_path, t.name_en
    from public.gym_equipment_inventory i
    join public.equipment e on e.id = i.equipment_id
    join public.equipment_brands b on b.id = e.brand_id
    left join public.equipment_images im on im.equipment_id = e.id
    left join public.equipment_type_assignments a on a.equipment_id = e.id
    left join public.equipment_types t on t.code = a.equipment_type_code
    where i.verified_status in ('admin_verified', 'owner_verified') limit 1;
end $$;
grant execute on function pg_temp.assert_frontend_reads() to anon, authenticated;
set local role anon;
select pg_temp.assert_frontend_reads();
reset role;
set local role authenticated;
select pg_temp.assert_frontend_reads();
reset role;
rollback;
