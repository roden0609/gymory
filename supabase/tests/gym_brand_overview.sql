-- Run after 0071. All fixtures and schema changes roll back.
begin;
insert into public.gyms(id,name,slug,district_code,is_active,dumbbell_max_weight_kg,has_free_water)
values ('00000000-0071-4000-8000-000000000001','Brand overview active','brand-overview-active-0071','HK-YTM',true,40,true),
('00000000-0071-4000-8000-000000000002','Brand overview private','brand-overview-private-0071','HK-YTM',false,40,true);
insert into public.gym_equipment_type_inventory(gym_id,equipment_code,quantity,is_directly_reported)
values ('00000000-0071-4000-8000-000000000001','rack',3,true),
('00000000-0071-4000-8000-000000000001','treadmill',4,true),
('00000000-0071-4000-8000-000000000001','rower',2,true),
('00000000-0071-4000-8000-000000000001','bench',99,true);


create function pg_temp.assert_brand_overview() returns void language plpgsql as $$
begin
  if has_table_privilege(current_user,'public.gym_brand_overview_public','SELECT') then
    raise exception 'Brand overview must use column grants';
  end if;
  if (select count(*) from public.gym_brand_overview_public where slug like 'brand-overview-%-0071') <> 1 then
    raise exception 'Inactive gyms exposed through brand overview';
  end if;
  if not exists(select 1 from public.gym_brand_overview_public
    where slug='brand-overview-active-0071' and rack_count=3 and treadmill_count=4
      and rower_count=2 and dumbbell_max_weight_kg=40 and has_free_water) then
    raise exception 'Brand summary quantities changed';
  end if;
  -- Compare against the general view under the same public RLS on real rows.
  if exists (
    (select slug,district_code,rack_count,treadmill_count,rower_count from public.gym_brand_overview_public
      except select slug,district_code,rack_count,treadmill_count,rower_count from public.gyms_public)
    union all
    (select slug,district_code,rack_count,treadmill_count,rower_count from public.gyms_public
      except select slug,district_code,rack_count,treadmill_count,rower_count from public.gym_brand_overview_public)
  ) then raise exception 'Specialized view differs from general public projection'; end if;
  if exists(select 1 from information_schema.column_privileges where table_schema='public'
    and table_name='gym_brand_overview_public' and grantee=current_user and privilege_type <> 'SELECT') then
    raise exception 'Unexpected brand overview write privilege';
  end if;
end $$;
grant execute on function pg_temp.assert_brand_overview() to anon,authenticated;
set local role anon;
select pg_temp.assert_brand_overview();
reset role;
set local role authenticated;
select pg_temp.assert_brand_overview();
reset role;
rollback;
