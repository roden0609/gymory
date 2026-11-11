begin;
create or replace function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception '%',message; end if; end $$;
insert into public.equipment_brands(id,name_en,slug)
values('00000000-0065-4000-8000-000000000001','Display priority test','display-priority-test-0065');
insert into public.equipment(id,brand_id,name,name_zh,slug,captured_name,captured_name_zh,official_name,source_type)
values('00000000-0065-4000-8000-000000000002','00000000-0065-4000-8000-000000000001',
  'Manual name','人工名稱','display-priority-test-0065','Captured name','擷取名稱','Official name','manual');
select pg_temp.assert((select name='Official name' and name_zh='擷取名稱' from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Each language chooses its own source on insert');
update public.equipment set name='Attempted override',name_zh='手動覆蓋',official_name_zh='官方名稱'
where id='00000000-0065-4000-8000-000000000002';
select pg_temp.assert((select name='Official name' and name_zh='官方名稱' and captured_name='Captured name' from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Admin/catalog edits cannot override source priority or rewrite provenance');
update public.equipment set official_name='  ',official_name_zh=null
where id='00000000-0065-4000-8000-000000000002';
select pg_temp.assert((select name='Captured name' and name_zh='擷取名稱' and slug='display-priority-test-0065' from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Removing official names restores captured names and preserves URLs');
update public.equipment set official_verified_at=now(),official_verified_by='test-admin'
where id='00000000-0065-4000-8000-000000000002';
update public.equipment set official_name='Revised official'
where id='00000000-0065-4000-8000-000000000002';
select pg_temp.assert((select name='Revised official' and official_verified_at is null from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Effective changes withdraw previous approval');
insert into public.equipment(brand_id,name,name_zh,slug,source_type)
values('00000000-0065-4000-8000-000000000001','Manual only','人工名稱','manual-priority-test-0065','manual');
update public.equipment set name='Manual revised' where slug='manual-priority-test-0065';
select pg_temp.assert((select name='Manual revised' and name_zh='人工名稱' from public.equipment where slug='manual-priority-test-0065'),'Manual equipment stays editable when no provenance exists');
rollback;
