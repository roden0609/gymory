-- Run after 0075. All fixtures roll back.
begin;
-- Backfill matches every existing public slug membership.
do $$ begin
  if exists(select 1 from public.gyms where gym_chain_code is distinct from public.gym_chain_code_from_slug(slug)) then
    raise exception 'Existing brand backfill differs from slug matching';
  end if;
end $$;
insert into public.gyms(id,name,slug,district_code,is_active) values
('00000000-0075-4000-8000-000000000001','Chain active','24-7-fitness-code-fixture-0075','HK-YTM',true),
('00000000-0075-4000-8000-000000000002','Chain inactive','24-7-fitness-hidden-fixture-0075','HK-YTM',false),
('00000000-0075-4000-8000-000000000003','Independent','independent-code-fixture-0075','HK-YTM',true);
insert into public.gyms(id,name,slug,district_code,is_active,gym_chain_code) values
('00000000-0075-4000-8000-000000000004','Explicit chain','custom-code-fixture-0075','HK-YTM',true,'anytime');
update public.gyms set slug='renamed-code-fixture-0075' where id='00000000-0075-4000-8000-000000000004';
do $$ begin
  if (select gym_chain_code from public.gyms where id='00000000-0075-4000-8000-000000000004') <> 'anytime' then
    raise exception 'Explicit chain classification lost on rename';
  end if;
  begin
    update public.gyms set gym_chain_code='unknown' where id='00000000-0075-4000-8000-000000000003';
    raise exception 'Invalid chain code accepted';
  exception when check_violation then null; end;
end $$;

create function pg_temp.assert_chain_code() returns void language plpgsql as $$
declare relation_name text; visible integer;
begin
  foreach relation_name in array array['gyms','gyms_public','gym_search_public','gym_brand_overview_public'] loop
    if has_table_privilege(current_user,'public.'||relation_name,'SELECT') then
      raise exception 'Chain migration must not add table-wide grants';
    end if;
    execute format('select count(*) from public.%I where gym_chain_code = %L and slug like %L',relation_name,'247','%fixture-0075') into visible;
    if visible <> 1 then raise exception 'Chain equality or inactive RLS failed on %',relation_name; end if;
  end loop;
  if (select count(*) from public.gym_search_public where gym_chain_code in ('247','anytime')
      and id::text like '00000000-0075-%') <> 2 then
    raise exception 'Multi-brand query failed';
  end if;
  if not exists(select 1 from public.gym_search_public where slug='independent-code-fixture-0075' and gym_chain_code is null) then
    raise exception 'Independent gym classified unexpectedly';
  end if;
  begin
    perform source_url from public.equipment limit 0;
    raise exception 'Private equipment source became readable';
  exception when insufficient_privilege then null; end;
  begin
    perform data_source from public.gyms limit 0;
    raise exception 'Private provenance became readable';
  exception when insufficient_privilege then null; end;
end $$;
grant execute on function pg_temp.assert_chain_code() to anon,authenticated;
set local role anon; select pg_temp.assert_chain_code(); reset role;
set local role authenticated; select pg_temp.assert_chain_code(); reset role;
set local role service_role;
select id,gym_chain_code from public.gyms where id='00000000-0075-4000-8000-000000000002';
reset role;
rollback;
