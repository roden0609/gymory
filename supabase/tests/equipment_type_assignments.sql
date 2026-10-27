-- Run after 0060; fixtures and all edits roll back.
begin;
create function pg_temp.assert(p_condition boolean,p_message text) returns void language plpgsql as $$
begin if p_condition is not true then raise exception '%',p_message; end if; end $$;
select pg_temp.assert(not exists(select 1 from public.equipment e left join public.equipment_type_assignments a on a.equipment_id=e.id and a.is_primary where a.equipment_id is null or a.equipment_type_code<>e.equipment_type_code),'Backfill must preserve every existing primary');
select pg_temp.assert(not exists(select 1 from public.equipment_type_assignments a join public.equipment e on e.id=a.equipment_id where a.source='admin' and e.import_method<>'admin' and a.is_primary and a.created_at=a.updated_at and a.created_at=(select min(created_at) from public.equipment_type_assignments)),'Backfill must not mislabel imported primaries as administrator choices');
insert into public.gyms(id,name,slug,district_code) values('00000000-0060-4000-8000-000000000001','Assignment test','assignment-test-0060','HK-CW');
insert into public.equipment_brands(id,name_en,slug) values('00000000-0060-4000-8000-000000000002','Assignment test','assignment-test-0060');
insert into public.equipment(id,brand_id,equipment_type_code,name,slug,source_type,status,source_external_id,import_method)
values('00000000-0060-4000-8000-000000000003','00000000-0060-4000-8000-000000000002','chest_fly_machine','Multi function','multi-function-0060','official','active','247-fitness:0060','seed');
insert into public.gym_equipment_inventory(gym_id,equipment_id,quantity,source,verified_status,verified_at)
values('00000000-0060-4000-8000-000000000001','00000000-0060-4000-8000-000000000003',2,'admin','admin_verified',now());
select pg_temp.assert(public.sync_247_equipment_type_assignments('00000000-0060-4000-8000-000000000003','247-fitness:0060','chest_fly_machine',array['reverse_fly_machine','bicep_curl_machine'],true)=2,'Importer must support more than one additional capability');
select pg_temp.assert((select count(*)=3 from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000003'),'Three distinct assignments expected');
select pg_temp.assert(public.sync_247_equipment_type_assignments('00000000-0060-4000-8000-000000000003','247-fitness:0060','chest_fly_machine',array['reverse_fly_machine','bicep_curl_machine'],true)=0,'Repeated import must not create duplicate capabilities');
select pg_temp.assert((select quantity=2 from public.gym_equipment_inventory where equipment_id='00000000-0060-4000-8000-000000000003'),'Capabilities must not multiply physical inventory');
select pg_temp.assert(public.gym_matches_equipment_requirements('00000000-0060-4000-8000-000000000001','[{"equipmentCode":"reverse_fly_machine"},{"equipmentCode":"bicep_curl_machine"}]'),'Generic search must match additional capabilities');
set local role anon;
select pg_temp.assert((select count(*)=3 from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000003'),'Public can read all active capabilities');
select pg_temp.assert((select count(*)=3 from public.gym_equipment_type_inventory where gym_id='00000000-0060-4000-8000-000000000001'),'Verified model publishes all three summaries');
reset role;
update public.gym_equipment_inventory set verified_status='unverified' where equipment_id='00000000-0060-4000-8000-000000000003';
select pg_temp.assert(not public.gym_type_has_public_models('00000000-0060-4000-8000-000000000001','reverse_fly_machine'),'Unverified inventory must not publish secondary function');
update public.gym_equipment_inventory set verified_status='admin_verified' where equipment_id='00000000-0060-4000-8000-000000000003';

-- Constraints apply to direct SQL as well as the backend RPC.
do $$ begin
  begin
    insert into public.equipment_type_assignments(equipment_id,equipment_type_code) values('00000000-0060-4000-8000-000000000003','reverse_fly_machine');
    raise exception 'Duplicate assignment accepted';
  exception when unique_violation then null; end;
  begin
    update public.equipment_type_assignments set is_primary=true where equipment_id='00000000-0060-4000-8000-000000000003' and equipment_type_code='reverse_fly_machine';
    raise exception 'Two primary assignments accepted';
  exception when unique_violation then null; end;
  begin
    delete from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000003' and is_primary;
    set constraints trg_check_equipment_primary_assignment immediate;
    raise exception 'Missing primary assignment accepted';
  exception when raise_exception then
    if sqlerrm='Missing primary assignment accepted' then raise; end if;
  end;
end $$;
set constraints all deferred;

-- A type referenced only by a secondary row is still protected from deletion.
insert into public.equipment_types(code,name_en,category) values('assignment_test_secondary','Test','arm');
insert into public.equipment_type_assignments(equipment_id,equipment_type_code,source) values('00000000-0060-4000-8000-000000000003','assignment_test_secondary','admin');
do $$ begin
  begin delete from public.equipment_types where code='assignment_test_secondary'; raise exception 'Referenced secondary type deleted';
  exception when foreign_key_violation then null; end;
end $$;
-- Sync only removes its own old rows, never admin-added capabilities.
select public.sync_247_equipment_type_assignments('00000000-0060-4000-8000-000000000003','247-fitness:0060','chest_fly_machine',array['reverse_fly_machine'],false);
select pg_temp.assert(exists(select 1 from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000003' and equipment_type_code='assignment_test_secondary'),'Import removed admin secondary');
select pg_temp.assert(not exists(select 1 from public.gym_equipment_type_inventory where gym_id='00000000-0060-4000-8000-000000000001' and equipment_code='bicep_curl_machine'),'Removed capability must clean its derived presence');
select pg_temp.assert(public.sync_247_equipment_type_assignments('00000000-0060-4000-8000-000000000003','247-fitness:other','chest_fly_machine',array['bicep_curl_machine'],false)=0,'Wrong source identity must not change assignments');

select public.set_equipment_type_assignments('00000000-0060-4000-8000-000000000003','reverse_fly_machine',array['chest_fly_machine','bicep_curl_machine']);
select pg_temp.assert((select e.equipment_type_code='reverse_fly_machine' and c.slug='shoulder' from public.equipment e join public.equipment_categories c on c.id=e.category_id where e.id='00000000-0060-4000-8000-000000000003'),'Primary assignment must synchronize compatibility type/category');
select pg_temp.assert(public.sync_247_equipment_type_assignments('00000000-0060-4000-8000-000000000003','247-fitness:0060','reverse_fly_machine',array[]::text[],false)=0,'Import must preserve admin-owned primary and secondary choices');

-- Primary reclassification must also respect ownership and be atomic with additions.
insert into public.equipment(id,brand_id,equipment_type_code,name,slug,source_type,status,source_external_id,import_method)
values('00000000-0060-4000-8000-000000000004','00000000-0060-4000-8000-000000000002','other_equipment','Other model','other-model-0060','official','active','247-fitness:0061','seed');
update public.equipment_type_assignments set source='admin' where equipment_id='00000000-0060-4000-8000-000000000004';
select pg_temp.assert((public.apply_247_equipment_classification('00000000-0060-4000-8000-000000000004','247-fitness:0061','chest_fly_machine',array['reverse_fly_machine'],false)->>'reclassified')::integer=0,'Importer must preserve even an admin-owned Other classification');
update public.equipment_type_assignments set source='legacy' where equipment_id='00000000-0060-4000-8000-000000000004';
do $$ begin
  begin
    perform public.apply_247_equipment_classification('00000000-0060-4000-8000-000000000004','247-fitness:0061','chest_fly_machine',array['missing_assignment_type'],false);
    raise exception 'Bad additional type accepted';
  exception when raise_exception then if sqlerrm='Bad additional type accepted' then raise; end if; end;
end $$;
select pg_temp.assert((select equipment_type_code='other_equipment' from public.equipment where id='00000000-0060-4000-8000-000000000004'),'Failed import must roll back primary reclassification');
select pg_temp.assert((public.apply_247_equipment_classification('00000000-0060-4000-8000-000000000004','247-fitness:0061','chest_fly_machine',array['reverse_fly_machine'],false)->>'reclassified')::integer=1,'Importer must atomically reclassify its own Other model');
select pg_temp.assert(not exists(select 1 from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000004' and equipment_type_code='other_equipment'),'Reclassification must remove obsolete Other capability');

-- The complete admin save rolls back a record edit on assignment failure.
do $$ begin
  begin
    perform public.save_equipment_catalog_machine('00000000-0060-4000-8000-000000000003',jsonb_build_object('brand_id','00000000-0060-4000-8000-000000000002','name','Incorrect partial save','slug','partial-0060','labels','[]'::jsonb,'status','active','source_type','manual','equipment_type_code','chest_fly_machine'),array['missing_assignment_type'],array[]::text[]);
    raise exception 'Invalid assignment accepted';
  exception when raise_exception then if sqlerrm='Invalid assignment accepted' then raise; end if; end;
end $$;
select pg_temp.assert((select name='Multi function' and equipment_type_code='reverse_fly_machine' from public.equipment where id='00000000-0060-4000-8000-000000000003'),'Failed admin assignment save leaked partial machine edits');

update public.equipment set equipment_type_code='leg_press_machine' where id='00000000-0060-4000-8000-000000000003';
select pg_temp.assert((select count(*)=1 from public.equipment_type_assignments where equipment_id='00000000-0060-4000-8000-000000000003' and is_primary and equipment_type_code='leg_press_machine'),'Legacy writer must still maintain canonical primary');
select pg_temp.assert(not has_table_privilege('anon','public.equipment_type_assignments','INSERT'),'Public assignment writes must be denied');
select pg_temp.assert(not has_function_privilege('authenticated','public.set_equipment_type_assignments(uuid,text,text[])','EXECUTE'),'Assignment mutation RPC must be backend only');
set constraints all immediate;
delete from public.equipment where id='00000000-0060-4000-8000-000000000003';
select pg_temp.assert(not exists(select 1 from public.gym_equipment_type_inventory where gym_id='00000000-0060-4000-8000-000000000001'),'Deleting model must clean all derived summaries');
rollback;
