-- Run after 0063. All fixtures roll back.
begin;
do $$
begin
  if exists (
    select 1 from pg_constraint c
    where c.conrelid='public.equipment_images'::regclass and c.contype='u'
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(c.conkey) k(attnum)
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum)
          = array['equipment_id','url']::text[]
  ) then raise exception 'Legacy URL key must be removed regardless of its name'; end if;
end $$;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception '%',message; end if; end $$;
insert into public.equipment_brands(id,name_en,slug) values('00000000-0063-4000-8000-000000000001','Image review test','image-review-test-0063');
insert into public.equipment(id,brand_id,name,slug,model_number,source_external_id,source_type,status)
values('00000000-0063-4000-8000-000000000002','00000000-0063-4000-8000-000000000001','Source name','image-review-test-0063','M1','247-fitness:630000','manual','unknown');
select pg_temp.assert((select official_status='not_researched' from public.equipment where id='00000000-0063-4000-8000-000000000002'),'New equipment must be unresearched');

select public.import_equipment_official_research('247-fitness:630000','M1',
  '{"name":"Official candidate","model":"M1","status":"candidate_requires_review","note":"Configuration uncertain"}',
  '[{"role":"captured","url":"https://example.com/same.jpg"},{"role":"official","url":"https://example.com/same.jpg"}]');
select pg_temp.assert((select count(*)=2 from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002'),'Same URL can have two distinct roles');
select pg_temp.assert((select name='Source name' and official_name='Official candidate' and official_verified_at is null from public.equipment where id='00000000-0063-4000-8000-000000000002'),'Import preserves source identity and does not approve candidates');

select public.save_equipment_official_review(id,updated_at,'Approved name','M1','https://example.com/model',official_status,'Accepted configuration',true,'firebase-admin-uid')
from public.equipment where id='00000000-0063-4000-8000-000000000002';
select pg_temp.assert((select official_verified_by='firebase-admin-uid' and official_verified_at is not null and official_status='candidate_requires_review' from public.equipment where id='00000000-0063-4000-8000-000000000002'),'Human approval retains research result');
select pg_temp.assert(public.import_equipment_official_research('247-fitness:630000','M1','{"status":"unresolved"}','[]')='skipped_verified','Importer must skip approved data');

do $$
declare eq uuid := '00000000-0063-4000-8000-000000000002'; image_id uuid;
begin
  select id into image_id from public.equipment_images where equipment_id=eq and image_role='official';
  begin
    perform public.select_equipment_primary_image(eq,image_id,'https://example.com/same.jpg');
    raise exception 'Expected missing Storage image to fail';
  exception when others then
    if sqlerrm='Expected missing Storage image to fail' then raise; end if;
  end;
  begin
    perform public.select_equipment_primary_image(eq,image_id,'https://example.com/same.jpg',eq::text||'/'||image_id::text||'/missing.jpg');
    raise exception 'Expected missing Storage object to fail';
  exception when others then
    if sqlerrm='Expected missing Storage object to fail' then raise; end if;
  end;
  begin
    perform public.save_equipment_official_review(eq,'2000-01-01','Wrong','M1',null,'unresolved',null,true,'admin');
    raise exception 'Expected stale review to fail';
  exception when others then
    if sqlerrm not like '%Stale equipment review%' then raise; end if;
  end;
end $$;

-- Storage publication is independent of approval; switching main images is atomic.
insert into storage.objects(bucket_id,name)
select 'equipment-images',equipment_id::text||'/'||id::text||'/test.jpg' from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002';
select public.select_equipment_primary_image(equipment_id,id,url,equipment_id::text||'/'||id::text||'/test.jpg')
from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002' and image_role='captured';
select public.select_equipment_primary_image(equipment_id,id,url,equipment_id::text||'/'||id::text||'/test.jpg')
from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002' and image_role='official';
select pg_temp.assert((select count(*)=1 from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002' and is_primary),'Exactly one primary image');
select pg_temp.assert((select official_verified_at is not null from public.equipment where id='00000000-0063-4000-8000-000000000002'),'Selecting/uploading display image must not withdraw approval');

update public.equipment_images set url='https://example.com/replaced.jpg'
where equipment_id='00000000-0063-4000-8000-000000000002' and image_role='official';
select pg_temp.assert((select official_verified_at is null and official_verified_by is null from public.equipment where id='00000000-0063-4000-8000-000000000002'),'Image replacement invalidates approval');
select pg_temp.assert((select storage_path is null and not is_primary from public.equipment_images where equipment_id='00000000-0063-4000-8000-000000000002' and image_role='official'),'Replaced URL must not retain old Storage image');

select public.save_equipment_official_review(id,updated_at,'Approved name','M1',null,official_status,null,true,'admin') from public.equipment where id='00000000-0063-4000-8000-000000000002';
update public.equipment set official_model_number='M2' where id='00000000-0063-4000-8000-000000000002';
select pg_temp.assert((select official_verified_at is null from public.equipment where id='00000000-0063-4000-8000-000000000002'),'Official model changes invalidate approval');

do $$
begin
  begin
    update public.equipment set official_status='admin_verified' where id='00000000-0063-4000-8000-000000000002';
    raise exception 'Expected unsupported status to fail';
  exception when check_violation then null; end;
  begin
    perform public.import_equipment_official_research('247-fitness:630000','WRONG','{"status":"unresolved"}','[]');
    raise exception 'Expected stale source model to fail';
  exception when others then if sqlerrm not like '%source model does not match%' then raise; end if; end;
end $$;
select pg_temp.assert(not has_function_privilege('authenticated','public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text)','EXECUTE'),'Browser users cannot approve official data');
select pg_temp.assert(not has_function_privilege('anon','public.select_equipment_primary_image(uuid,uuid,text,text)','EXECUTE'),'Anonymous users cannot choose primary images');
rollback;
