-- Run after 0081 against a local/test database. All fixtures roll back.
begin;
insert into public.gyms(id, name, slug, district_code, is_active, data_source,
  data_accuracy_status, is_verified, updated_at, lat, lng) values
('00000000-0077-4000-8000-000000000001', 'Search liked', 'search-liked-0077', 'HK-YTM', true, 'import', 'normal', false, '2026-01-01', 22.3, 114.1),
('00000000-0077-4000-8000-000000000002', 'Search verified', 'search-verified-0077', 'HK-YTM', true, 'import', 'normal', true, '2026-01-01', 22.4, 114.2),
('00000000-0077-4000-8000-000000000003', 'Search flagged', 'search-flagged-0077', 'HK-WC', true, 'import', 'needs_review', true, '2026-02-01', null, null),
('00000000-0077-4000-8000-000000000004', 'Search hidden', 'search-hidden-0077', 'HK-YTM', false, 'import', 'normal', true, '2026-02-01', 22.3, 114.1),
('00000000-0077-4000-8000-000000000005', 'Search recent', 'search-recent-0077', 'HK-YTM', true, 'import', 'normal', false, '2026-01-02', null, null);
update public.gyms set is_hyrox_official = true
where slug in ('search-liked-0077', 'search-verified-0077', 'search-hidden-0077');
insert into public.users(id, firebase_uid, firebase_email) values
('00000000-0077-4000-8000-000000000006', 'search-0077', 'search-0077@example.invalid');
insert into public.gym_accuracy_votes(gym_id,user_id,vote) values
('00000000-0077-4000-8000-000000000001','00000000-0077-4000-8000-000000000006','like');

-- Simulate a future private view column. The RPC output must stay fixed and
-- ordinary callers must still lack access to the new column (rolled back).
do $$
declare definition text; projection text;
begin
  select pg_get_viewdef('public.gym_search_public'::regclass, true) into definition;
  select string_agg('v.' || quote_ident(attname), ', ' order by attnum) into projection
    from pg_attribute where attrelid='public.gym_search_public'::regclass
      and attnum > 0 and not attisdropped;
  execute 'create or replace view public.gym_search_public with (security_invoker=true) as select '
    || projection || ', ''private-future-value''::text as future_private from ('
    || rtrim(definition, E';\n ') || ') v';
end $$;

create function pg_temp.assert_paginated_search() returns void language plpgsql as $$
declare
  ids uuid[] := array[
    '00000000-0077-4000-8000-000000000001', '00000000-0077-4000-8000-000000000002',
    '00000000-0077-4000-8000-000000000003', '00000000-0077-4000-8000-000000000004',
    '00000000-0077-4000-8000-000000000005']::uuid[];
  actual text[];
begin
  select array_agg(slug order by search_order) into actual from public.search_gyms(ids);
  if actual is distinct from array['search-verified-0077','search-liked-0077','search-recent-0077','search-flagged-0077'] then
    raise exception 'Accuracy/verified/vote/date ranking changed: %', actual;
  end if;
  select array_agg(slug order by search_order) into actual from public.search_gyms(ids,22.3,114.1);
  if actual is distinct from array['search-liked-0077','search-verified-0077','search-recent-0077','search-flagged-0077'] then
    raise exception 'Distance or null-coordinate ranking changed: %', actual;
  end if;
  select array_agg(slug order by search_order) into actual from (
    select slug, search_order from public.search_gyms(ids)
    where district_code = 'HK-YTM' order by search_order offset 1 limit 2
  ) page;
  if actual is distinct from array['search-liked-0077','search-recent-0077'] then
    raise exception 'Filters and global pagination changed: %', actual;
  end if;
  select array_agg(slug order by search_order) into actual
  from public.search_gyms(ids, null, null, 'hyrox-official-hong-kong');
  if actual is distinct from array['search-verified-0077','search-liked-0077'] then
    raise exception 'Collection membership, active rows, or ranking changed: %', actual;
  end if;
  select array_agg(slug order by search_order) into actual from (
    select slug, search_order from public.search_gyms(ids, 22.3, 114.1, 'hyrox-official-hong-kong')
    where district_code = 'HK-YTM' order by search_order limit 1
  ) page;
  if actual is distinct from array['search-liked-0077'] then
    raise exception 'Collection distance ranking or pagination changed: %', actual;
  end if;
  if exists(select from public.search_gyms(ids, null, null, 'unknown'))
    or exists(select from public.search_gyms(array[]::uuid[], null, null, 'hyrox-official-hong-kong')) then
    raise exception 'Unknown collections or empty IDs widened the search';
  end if;
  if exists(select from jsonb_object_keys((select to_jsonb(r)
    from public.search_gyms(ids, null, null, 'hyrox-official-hong-kong') r limit 1)) k
    where k in ('source_url','captured_name','captured_name_zh','source','data_source','user_id','url','future_private')) then
    raise exception 'Collection RPC exposes restricted output';
  end if;
  if (select count(*) from public.search_gyms(ids) where district_code='HK-YTM') <> 3 then
    raise exception 'Filtered total changed';
  end if;
  if exists(select 1 from public.search_gyms(array[]::uuid[])) then
    raise exception 'Empty IDs widened to all gyms';
  end if;
  if not exists(select 1 from public.search_gyms() where slug='search-liked-0077' and accuracy_like_count=1) then
    raise exception 'Unfiltered search or live votes changed';
  end if;
  if exists(select 1 from public.search_gyms(ids) where slug='search-hidden-0077') then
    raise exception 'Inactive gym leaked';
  end if;
  begin
    execute 'select future_private from public.gym_search_public limit 1';
    raise exception 'New view column readable';
  exception when insufficient_privilege then null; end;
  begin
    perform data_source from public.gyms limit 1;
    raise exception 'Private source readable';
  exception when insufficient_privilege then null; end;
  begin
    perform source from public.equipment_type_assignments limit 1;
    raise exception 'Private assignment source readable';
  exception when insufficient_privilege then null; end;
  begin
    perform captured_name, captured_name_zh, source_url from public.equipment limit 1;
    raise exception 'Private equipment fields readable';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from jsonb_object_keys((select to_jsonb(r) from public.search_gyms(ids) r limit 1)) k
    where k in ('source_url','captured_name','captured_name_zh','source','data_source','user_id','url','future_private')) then
    raise exception 'RPC exposes restricted output';
  end if;
end $$;
grant execute on function pg_temp.assert_paginated_search() to anon,authenticated;
set local role anon; select pg_temp.assert_paginated_search(); reset role;
set local role authenticated; select pg_temp.assert_paginated_search(); reset role;

-- The fixed RETURNS TABLE allowlist must not adopt future view columns.
do $$ begin
  if (select prosecdef from pg_proc where oid='public.search_gyms(uuid[],double precision,double precision,text)'::regprocedure) then
    raise exception 'Search must remain security invoker';
  end if;
  if exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a
    where p.oid='public.search_gyms(uuid[],double precision,double precision,text)'::regprocedure and a.grantee=0) then
    raise exception 'PUBLIC execute must be revoked';
  end if;
end $$;
set local role service_role;
do $$ begin
  if not exists(select 1 from public.gyms where slug='search-hidden-0077' and data_source='import') then
    raise exception 'Authorized backend access changed';
  end if;
end $$;
reset role;
rollback;
