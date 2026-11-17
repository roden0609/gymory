-- Run with psql -v ON_ERROR_STOP=1. Read-only security assertions.
begin;
do $$
declare role_name text; column_name text;
begin
  foreach role_name in array array['anon','authenticated'] loop
    if has_table_privilege(role_name,'public.equipment_captured_images','SELECT') then
      raise exception '% can read private captured images',role_name;
    end if;
    foreach column_name in array array['id','equipment_id','source_url','storage_path'] loop
      if has_column_privilege(role_name,'public.equipment_captured_images',column_name,'SELECT') then
        raise exception '% can read private column %',role_name,column_name;
      end if;
    end loop;
  end loop;
  if not (select relrowsecurity from pg_class where oid='public.equipment_captured_images'::regclass) then
    raise exception 'Missing RLS';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='equipment_captured_images') then
    raise exception 'Unexpected client policies';
  end if;
  if not exists(select 1 from storage.buckets where id='equipment-captured-images' and public=false) then
    raise exception 'Captured bucket must be private';
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='captured_images_private' and permissive='RESTRICTIVE') then
    raise exception 'Missing restrictive client Storage policy';
  end if;
end $$;
set local role anon;
do $$ begin
  begin perform source_url from public.equipment_captured_images; raise exception 'Anonymous read succeeded';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin perform storage_path from public.equipment_captured_images; raise exception 'Ordinary user read succeeded';
  exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
select count(*) as backend_accessible_records from public.equipment_captured_images;
rollback;
