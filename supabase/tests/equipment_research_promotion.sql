-- Run after 0066. No persistent fixtures or Storage objects remain.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception '%',message; end if; end $$;
insert into public.equipment_brands(id,name_en,slug) values('00000000-0066-4000-8000-000000000001','Promotion test','promotion-test-0066');
insert into public.equipment(id,brand_id,name,slug,model_number,source_external_id,source_type,captured_name,captured_name_zh)
values('00000000-0066-4000-8000-000000000002','00000000-0066-4000-8000-000000000001','Captured','promotion-test-0066','M1','247-fitness:660000','manual','Captured','擷取');
insert into public.equipment_images(id,equipment_id,image_role,url,source_type)
values('00000000-0066-4000-8000-000000000003','00000000-0066-4000-8000-000000000002','captured','https://example.com/captured.webp','manual');
insert into storage.objects(bucket_id,name) values('equipment-images','00000000-0066-4000-8000-000000000002/00000000-0066-4000-8000-000000000003/captured.webp');
select public.select_equipment_primary_image('00000000-0066-4000-8000-000000000002','00000000-0066-4000-8000-000000000003','https://example.com/captured.webp','00000000-0066-4000-8000-000000000002/00000000-0066-4000-8000-000000000003/captured.webp');
insert into storage.objects(bucket_id,name) values('equipment-images','00000000-0066-4000-8000-000000000002/00000000-0066-4000-8000-000000000004/official.webp');
select public.promote_equipment_research(id,updated_at,to_jsonb(e) || '{"official_name":"Official","official_name_zh":"官方","official_status":"model_verified"}',
  '{"id":"00000000-0066-4000-8000-000000000004","url":"https://example.com/official.webp","source_url":"https://example.com/product","storage_path":"00000000-0066-4000-8000-000000000002/00000000-0066-4000-8000-000000000004/official.webp"}')
from public.equipment e where id='00000000-0066-4000-8000-000000000002';
select pg_temp.assert((select name='Official' and name_zh='官方' and captured_name='Captured' and official_verified_at is null from public.equipment where id='00000000-0066-4000-8000-000000000002'),'Promotion synchronizes names without claiming human approval');
select pg_temp.assert((select is_primary from public.equipment_images where id='00000000-0066-4000-8000-000000000003'),'Existing captured primary remains selected');
select pg_temp.assert((select not is_primary and storage_path is not null from public.equipment_images where id='00000000-0066-4000-8000-000000000004'),'New official image is stored without overriding primary');
do $$
declare e public.equipment; i public.equipment_images;
begin
  select * into e from public.equipment where id='00000000-0066-4000-8000-000000000002';
  select * into i from public.equipment_images where id='00000000-0066-4000-8000-000000000004';
  begin
    perform public.promote_equipment_research(e.id,'2000-01-01',to_jsonb(e),null);
    raise exception 'Expected stale parent rejection';
  exception when others then if sqlerrm <> 'Stale equipment promotion' then raise; end if; end;
  begin
    perform public.promote_equipment_research(e.id,e.updated_at,to_jsonb(e)||'{"captured_name":"Overwrite"}',null);
    raise exception 'Expected provenance rejection';
  exception when others then if sqlerrm <> 'Captured provenance conflict' then raise; end if; end;
  begin
    perform public.promote_equipment_research(e.id,e.updated_at,to_jsonb(e)||'{"model_number":"Wrong"}',null);
    raise exception 'Expected model rejection';
  exception when others then if sqlerrm <> 'Promotion source identity mismatch' then raise; end if; end;
  begin
    perform public.promote_equipment_research(e.id,e.updated_at,to_jsonb(e)||'{"official_name":"Must roll back"}',to_jsonb(i)||jsonb_build_object('expected_updated_at','2000-01-01'));
    raise exception 'Expected stale image rejection';
  exception when others then if sqlerrm <> 'Stale promotion image' then raise; end if; end;
  perform pg_temp.assert((select official_name='Official' from public.equipment where id=e.id),'Image failure rolls back equipment change');
  perform public.promote_equipment_research(e.id,e.updated_at,to_jsonb(e),to_jsonb(i)||jsonb_build_object('expected_updated_at',i.updated_at));
end $$;
update public.equipment set official_verified_at=now(),official_verified_by='existing-admin' where id='00000000-0066-4000-8000-000000000002';
do $$
declare e public.equipment;
begin
  select * into e from public.equipment where id='00000000-0066-4000-8000-000000000002';
  begin
    perform public.promote_equipment_research(e.id,e.updated_at,to_jsonb(e),null);
    raise exception 'Expected approval protection';
  exception when others then if sqlerrm <> 'Admin verified equipment is protected' then raise; end if; end;
end $$;
select pg_temp.assert(not has_function_privilege('authenticated','public.promote_equipment_research(uuid,timestamptz,jsonb,jsonb)','EXECUTE'),'Promotion is service-role only');
rollback;
