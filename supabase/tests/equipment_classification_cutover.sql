-- Run after 0061; all fixtures and changes roll back.
begin;
create function pg_temp.assert(p_condition boolean,p_message text) returns void language plpgsql as $$
begin if p_condition is not true then raise exception '%',p_message; end if; end $$;
select pg_temp.assert(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipment' and column_name in ('equipment_type_code','category_id')),'Legacy columns must be removed');
select pg_temp.assert(not exists(select 1 from public.equipment e where not exists(select 1 from public.equipment_type_assignments a where a.equipment_id=e.id and a.is_primary)),'Existing models lost their primary');

insert into public.gyms(id,name,slug,district_code) values('00000000-0061-4000-8000-000000000001','Cutover test','cutover-test-0061','HK-CW');
insert into public.equipment_brands(id,name_en,slug) values('00000000-0061-4000-8000-000000000002','Cutover test','cutover-test-0061');
create temp table cutover_model_ids(kind text primary key,id uuid);
insert into cutover_model_ids values('admin',public.save_equipment_catalog_machine(null,
  jsonb_build_object('brand_id','00000000-0061-4000-8000-000000000002','name','Admin combo','slug','admin-combo-0061','primary_type_code','chest_fly_machine','labels','[]'::jsonb,'status','active','source_type','manual'),
  array['reverse_fly_machine','bicep_curl_machine'],array['Combo alias']));
select pg_temp.assert((select count(*)=3 from public.equipment_type_assignments where equipment_id=(select id from cutover_model_ids where kind='admin')),'Admin creation must store one primary and two additional capabilities');
select pg_temp.assert((select count(*)=1 from public.equipment_aliases where equipment_id=(select id from cutover_model_ids where kind='admin')),'Admin creation must save aliases in same transaction');
set constraints all immediate;
set constraints all deferred;

insert into public.gym_equipment_inventory(gym_id,equipment_id,quantity,source,verified_status,verified_at)
select '00000000-0061-4000-8000-000000000001',id,2,'admin','admin_verified',now() from cutover_model_ids where kind='admin';
select pg_temp.assert(public.gym_matches_equipment_requirements('00000000-0061-4000-8000-000000000001','[{"equipmentCode":"reverse_fly_machine"},{"equipmentCode":"bicep_curl_machine"}]'),'Secondary functions must remain searchable after cutover');
grant select on cutover_model_ids to anon;
set local role anon;
select pg_temp.assert((select count(*)=1 from public.equipment where id=(select id from cutover_model_ids where kind='admin')),'Primary/category RLS must not recurse');
select pg_temp.assert((select count(*)=3 from public.equipment_type_assignments where equipment_id=(select id from cutover_model_ids where kind='admin')),'All active functions must remain public');
reset role;

-- Category changes derive through the primary type without updating equipment.
update public.equipment_types set category='arm' where code='chest_fly_machine';
update public.equipment_categories set is_active=false where slug='arm';
set local role anon;
select pg_temp.assert((select count(*)=0 from public.equipment where id=(select id from cutover_model_ids where kind='admin')),'Primary category change must immediately control publication');
reset role;
update public.equipment_categories set is_active=true where slug='arm';
update public.equipment_types set category='chest' where code='chest_fly_machine';

-- Every new equipment row must obtain a primary before commit, even direct SQL.
do $$ begin
  begin
    insert into public.equipment(id,brand_id,name,slug,source_type) values('00000000-0061-4000-8000-000000000003','00000000-0061-4000-8000-000000000002','Orphan','orphan-0061','manual');
    set constraints trg_check_new_equipment_primary immediate;
    raise exception 'Missing primary accepted';
  exception when raise_exception then if sqlerrm='Missing primary accepted' then raise; end if; end;
end $$;
set constraints all deferred;

insert into cutover_model_ids
select 'import',(public.create_247_equipment_model(jsonb_build_object('brand_id','00000000-0061-4000-8000-000000000002','name','Imported combo','slug','imported-combo-0061','source_external_id','247-fitness:cutover0061'),
  'other_equipment',array[]::text[],false)->>'id')::uuid;
select pg_temp.assert((public.apply_247_equipment_classification((select id from cutover_model_ids where kind='import'),'247-fitness:cutover0061','chest_fly_machine',array['reverse_fly_machine','bicep_curl_machine'],true)->>'reclassified')::integer=1,'Importer must change the canonical primary, not a removed column');
select pg_temp.assert(not exists(select 1 from public.equipment_type_assignments where equipment_id=(select id from cutover_model_ids where kind='import') and equipment_type_code='other_equipment'),'Old Other assignment must be removed');
select pg_temp.assert((public.apply_247_equipment_classification((select id from cutover_model_ids where kind='import'),'247-fitness:cutover0061','chest_fly_machine',array['reverse_fly_machine','bicep_curl_machine'],true)->>'assignments_changed')::integer=0,'Repeat import must be idempotent');
select public.set_equipment_type_assignments((select id from cutover_model_ids where kind='import'),'chest_fly_machine',array['reverse_fly_machine']);
select pg_temp.assert((public.apply_247_equipment_classification((select id from cutover_model_ids where kind='import'),'247-fitness:cutover0061','leg_press_machine',array[]::text[],false)->>'reclassified')::integer=0,'Importer must not overwrite administrator assignments');

-- Creation and updates roll back the machine if a capability is invalid.
do $$ begin
  begin
    perform public.create_247_equipment_model(jsonb_build_object('brand_id','00000000-0061-4000-8000-000000000002','name','Bad import','slug','bad-import-0061','source_external_id','247-fitness:bad0061'),'chest_fly_machine',array['nonexistent_type_0061'],false);
    raise exception 'Invalid import accepted';
  exception when raise_exception then if sqlerrm='Invalid import accepted' then raise; end if; end;
  begin
    perform public.save_equipment_catalog_machine((select id from cutover_model_ids where kind='admin'),
      jsonb_build_object('brand_id','00000000-0061-4000-8000-000000000002','name','Partial bad save','slug','admin-combo-0061','primary_type_code','chest_fly_machine','labels','[]'::jsonb,'status','active','source_type','manual'),array['nonexistent_type_0061'],array[]::text[]);
    raise exception 'Invalid admin save accepted';
  exception when raise_exception then if sqlerrm='Invalid admin save accepted' then raise; end if; end;
end $$;
select pg_temp.assert(not exists(select 1 from public.equipment where slug='bad-import-0061'),'Failed import left an orphan model');
select pg_temp.assert((select name='Admin combo' from public.equipment where id=(select id from cutover_model_ids where kind='admin')),'Failed save leaked partial metadata edits');
select pg_temp.assert((select count(*)=1 from public.equipment_aliases where equipment_id=(select id from cutover_model_ids where kind='admin')),'Failed save removed aliases');
select pg_temp.assert(not has_function_privilege('anon','public.create_247_equipment_model(jsonb,text,text[],boolean)','EXECUTE'),'Importer creation must remain backend-only');
select pg_temp.assert(not has_table_privilege('authenticated','public.equipment_type_assignments','INSERT'),'Assignments must remain backend-only');
set constraints all immediate;
delete from public.equipment where id=(select id from cutover_model_ids where kind='admin');
select pg_temp.assert(not exists(select 1 from public.gym_equipment_type_inventory where gym_id='00000000-0061-4000-8000-000000000001'),'Deletion must clean all derived capabilities');
rollback;
