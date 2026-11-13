-- Run after 0073. All fixtures roll back.
begin;
insert into public.users(id,firebase_uid,firebase_email) values
('00000000-0073-4000-8000-000000000001','search-votes-test-1','test1@example.invalid'),
('00000000-0073-4000-8000-000000000002','search-votes-test-2','test2@example.invalid');
insert into public.gyms(id,name,slug,district_code,is_active,data_source) values
('00000000-0073-4000-8000-000000000003','Search active','search-active-0073','HK-YTM',true,'import'),
('00000000-0073-4000-8000-000000000004','Search hidden','search-hidden-0073','HK-YTM',false,'import'),
('00000000-0073-4000-8000-000000000005','Search zero votes','search-zero-0073','HK-YTM',true,null);
insert into public.gym_equipment_type_inventory(gym_id,equipment_code,quantity,is_directly_reported)
values ('00000000-0073-4000-8000-000000000003','rack',3,true);
insert into public.gym_accuracy_votes(gym_id,user_id,vote) values
('00000000-0073-4000-8000-000000000003','00000000-0073-4000-8000-000000000001','like'),
('00000000-0073-4000-8000-000000000003','00000000-0073-4000-8000-000000000002','dislike'),
('00000000-0073-4000-8000-000000000004','00000000-0073-4000-8000-000000000001','like');

create function pg_temp.assert_search_totals() returns void language plpgsql as $$
begin
  if has_table_privilege(current_user,'public.gym_search_public','SELECT') then
    raise exception 'Search view must use column grants';
  end if;
  if (select count(*) from public.gym_search_public where slug like 'search-%-0073') <> 2 then
    raise exception 'Inactive gym leaked through search view';
  end if;
  if not exists(select 1 from public.gym_search_public where slug='search-active-0073'
    and rack_count=3 and accuracy_like_count=1 and accuracy_dislike_count=1 and accuracy_total_votes=2) then
    raise exception 'Search summary or vote counts changed';
  end if;
  if not exists(select 1 from public.gym_search_public where slug='search-zero-0073'
    and accuracy_like_count=0 and accuracy_dislike_count=0 and accuracy_total_votes=0) then
    raise exception 'Unvoted gym must have zero counts';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='gym_search_public'
    and column_name in ('data_source','user_id','source_url','captured_name','captured_name_zh','official_review_note')) then
    raise exception 'Private column exposed through search';
  end if;
  begin
    perform data_source from public.gyms limit 1;
    raise exception 'Private base column readable';
  exception when insufficient_privilege then null; end;
  begin
    perform user_id from public.gym_accuracy_votes limit 1;
    raise exception 'Voter identity readable';
  exception when insufficient_privilege then null; end;
end $$;
grant execute on function pg_temp.assert_search_totals() to anon,authenticated;
set local role anon; select pg_temp.assert_search_totals(); reset role;
set local role authenticated; select pg_temp.assert_search_totals(); reset role;
set local role service_role;
do $$ begin
  if not exists(select 1 from public.gyms where slug='search-hidden-0073' and data_source='import') then
    raise exception 'Authorized backend access changed';
  end if;
end $$;
reset role;
rollback;
