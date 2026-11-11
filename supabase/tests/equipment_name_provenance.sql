-- Run after 0065. Fixtures and their changes roll back.
begin;
create or replace function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception '%',message; end if; end $$;
insert into public.equipment_brands(id,name_en,slug) values('00000000-0064-4000-8000-000000000001','Name provenance test','name-provenance-test-0064');
insert into public.equipment(id,brand_id,name,name_zh,slug,model_number,source_external_id,source_type,status)
values('00000000-0064-4000-8000-000000000002','00000000-0064-4000-8000-000000000001','Curated display','人工中文展示名','name-provenance-test-0064','M1','247-fitness:640000','manual','unknown');
select pg_temp.assert((select captured_name is null and official_name_zh is null from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Do not infer source/official names from display values');
select public.import_equipment_official_research('247-fitness:640000','M1',
  '{"captured_name":"Source name","captured_name_zh":"原始中文","name":"Official name","status":"candidate_requires_review"}','[]');
select pg_temp.assert((select captured_name='Source name' and captured_name_zh='原始中文' and name='Official name' and name_zh='原始中文' and official_name_zh is null from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Import adopts official English and captured Chinese without manufacturing an official translation');
select public.save_equipment_official_review(id,updated_at,'Official name','M1',null,official_status,null,true,'admin','官方中文',false)
from public.equipment where id='00000000-0064-4000-8000-000000000002';
select pg_temp.assert((select official_name_zh='官方中文' and official_verified_at is not null and name='Official name' and name_zh='官方中文' from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Saving official names synchronizes display names independently of the legacy apply flag');
update public.equipment set official_name_zh='官方中文修訂' where id='00000000-0064-4000-8000-000000000002';
select pg_temp.assert((select official_verified_at is null from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Official Chinese changes invalidate approval');
select public.import_equipment_official_research('247-fitness:640000','M1','{"name":"Official name","status":"model_verified"}','[]');
select pg_temp.assert((select official_name_zh='官方中文修訂' and captured_name='Source name' from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Missing translation/source keys must not clear existing data');
do $$
declare machine public.equipment;
begin
  select * into machine from public.equipment where id='00000000-0064-4000-8000-000000000002';
  begin
    perform public.save_equipment_official_review(machine.id,machine.updated_at,'Official name','M1',null,machine.official_status,null,false,'admin','官方中文',true);
    raise exception 'Applying unconfirmed names must fail';
  exception when others then if sqlerrm <> 'Confirm official data before applying display names' then raise; end if; end;
end $$;
select public.save_equipment_official_review(id,updated_at,'Official name','M1',null,official_status,null,true,'admin','',true)
from public.equipment where id='00000000-0064-4000-8000-000000000002';
select pg_temp.assert((select name='Official name' and name_zh='原始中文' and official_name_zh is null and captured_name='Source name' and captured_name_zh='原始中文' and official_verified_at is not null and slug='name-provenance-test-0064' from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Clearing official Chinese restores captured Chinese and preserves provenance and stable URL');
select public.save_equipment_official_review(id,updated_at,'Official name','M1',null,official_status,null,true,'admin','官方中文',true)
from public.equipment where id='00000000-0064-4000-8000-000000000002';
select pg_temp.assert((select name_zh='官方中文' and captured_name_zh='原始中文' from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Explicit application adopts confirmed official Chinese');
update public.equipment set captured_name=null,captured_name_zh=null where id='00000000-0064-4000-8000-000000000002';
select pg_temp.assert(public.import_equipment_official_research('247-fitness:640000','M1','{"captured_name":"Source name","captured_name_zh":"原始中文","name":"Overwrite attempt","status":"unresolved"}','[]')='skipped_verified','Approved official data stays protected during provenance backfill');
select pg_temp.assert((select official_name='Official name' and official_name_zh='官方中文' and official_verified_at is not null and captured_name='Source name' from public.equipment where id='00000000-0064-4000-8000-000000000002'),'Backfill can fill source names without withdrawing approval');
select public.create_247_equipment_model('{"brand_id":"00000000-0064-4000-8000-000000000001","name":"New source","name_zh":"新來源","model_number":"M2","slug":"new-name-provenance-test-0064","source_external_id":"247-fitness:640001"}', 'other_equipment', '{}');
select pg_temp.assert((select captured_name='New source' and captured_name_zh='新來源' and name='New source' and official_name_zh is null from public.equipment where source_external_id='247-fitness:640001'),'New source equipment captures provenance at creation');
select pg_temp.assert(not has_function_privilege('authenticated','public.save_equipment_official_review'::regproc,'EXECUTE'),'Review remains restricted to authenticated admin server actions');
rollback;
