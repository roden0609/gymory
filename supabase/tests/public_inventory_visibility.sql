-- Run after 0074. Every fixture and state change rolls back.
begin;
insert into public.gyms(id,name,slug,district_code,is_active) values
('00000000-0072-4000-8000-000000000001','Visibility fixture','visibility-fixture-0072','HK-YTM',true);
insert into public.equipment_brands(id,name_en,slug,is_active) values
('00000000-0072-4000-8000-000000000002','Visibility fixture','visibility-fixture-0072',true);
create temp table visibility_model(id uuid);
insert into visibility_model select (public.create_247_equipment_model(
jsonb_build_object('brand_id','00000000-0072-4000-8000-000000000002','name','Visibility fixture','slug','visibility-fixture-0072','source_external_id','247-fitness:0072'),
'chest_fly_machine',array['reverse_fly_machine'],true)->>'id')::uuid;
insert into public.gym_equipment_inventory(gym_id,equipment_id,source,verified_status,verified_at)
select '00000000-0072-4000-8000-000000000001',id,'import','admin_verified',now() from visibility_model;
grant select on visibility_model to anon,authenticated,service_role;
create function pg_temp.assert_visibility(p_primary boolean,p_secondary boolean) returns void language plpgsql as $$
begin
  if public.gym_type_has_public_models('00000000-0072-4000-8000-000000000001','chest_fly_machine') is distinct from p_primary
    or public.gym_type_has_public_models('00000000-0072-4000-8000-000000000001','reverse_fly_machine') is distinct from p_secondary then
    raise exception 'Visibility mismatch for %',current_user;
  end if;
  if exists(select 1 from public.public_gym_model_types()
      where gym_id='00000000-0072-4000-8000-000000000001' and equipment_code='chest_fly_machine') is distinct from p_primary
    or exists(select 1 from public.public_gym_model_types()
      where gym_id='00000000-0072-4000-8000-000000000001' and equipment_code='reverse_fly_machine') is distinct from p_secondary then
    raise exception 'Batch visibility mismatch for %',current_user;
  end if;
  if current_user <> 'service_role' then
    if exists(select 1 from public.gym_equipment_type_inventory
        where gym_id='00000000-0072-4000-8000-000000000001' and equipment_code='chest_fly_machine') is distinct from p_primary
      or exists(select 1 from public.gym_equipment_type_inventory
        where gym_id='00000000-0072-4000-8000-000000000001' and equipment_code='reverse_fly_machine') is distinct from p_secondary then
      raise exception 'Inventory RLS mismatch for %',current_user;
    end if;
    if (select has_chest_fly_machine is true from public.gym_search_public
        where id='00000000-0072-4000-8000-000000000001') is true and not p_primary then
      raise exception 'Derived private model leaked via search response';
    end if;
  end if;
  if public.gym_type_has_public_models('00000000-0072-4000-8000-000000000001','nonexistent') then
    raise exception 'Unknown type was published';
  end if;
end $$;
grant execute on function pg_temp.assert_visibility(boolean,boolean) to anon,authenticated,service_role;
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.gym_equipment_inventory set verified_status='unverified' where equipment_id in (select id from visibility_model);
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.gym_equipment_inventory set verified_status='owner_verified' where equipment_id in (select id from visibility_model);
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.gyms set is_active=false where id='00000000-0072-4000-8000-000000000001';
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.gyms set is_active=true where id='00000000-0072-4000-8000-000000000001';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment set status='discontinued' where id in (select id from visibility_model);
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.equipment set status='active' where id in (select id from visibility_model);
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment_brands set is_active=false where id='00000000-0072-4000-8000-000000000002';
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.equipment_brands set is_active=true where id='00000000-0072-4000-8000-000000000002';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment_types set is_active=false where code='chest_fly_machine';
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.equipment_types set is_active=true where code='chest_fly_machine';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment_types set is_active=false where code='reverse_fly_machine';
set local role anon; select pg_temp.assert_visibility(true,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,false); reset role;
set local role service_role; select pg_temp.assert_visibility(true,false); reset role;
update public.equipment_types set is_active=true where code='reverse_fly_machine';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment_categories set is_active=false where slug='chest';
set local role anon; select pg_temp.assert_visibility(false,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(false,false); reset role;
set local role service_role; select pg_temp.assert_visibility(false,false); reset role;
update public.equipment_categories set is_active=true where slug='chest';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
update public.equipment_categories set is_active=false where slug='shoulder';
set local role anon; select pg_temp.assert_visibility(true,false); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,false); reset role;
set local role service_role; select pg_temp.assert_visibility(true,false); reset role;
update public.equipment_categories set is_active=true where slug='shoulder';
set local role anon; select pg_temp.assert_visibility(true,true); reset role;
set local role authenticated; select pg_temp.assert_visibility(true,true); reset role;
set local role service_role; select pg_temp.assert_visibility(true,true); reset role;
rollback;
