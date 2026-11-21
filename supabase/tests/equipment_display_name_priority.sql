begin;
create or replace function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception '%',message; end if; end $$;

insert into public.equipment_brands(id,name_en,slug)
values('00000000-0065-4000-8000-000000000001','Independent names test','independent-names-test-0065');
insert into public.equipment(id,brand_id,name,name_zh,slug,captured_name,captured_name_zh,official_name,source_type)
values('00000000-0065-4000-8000-000000000002','00000000-0065-4000-8000-000000000001',
  'Public name','公開名稱','independent-names-test-0065','Private name','擷取名稱','Official name','manual');

select pg_temp.assert((select name='Public name' and name_zh='公開名稱' from public.equipment
  where id='00000000-0065-4000-8000-000000000002'),'Display names are independent on insert');

update public.equipment set name='Edited display',name_zh='已編輯公開名稱'
where id='00000000-0065-4000-8000-000000000002';
select pg_temp.assert((select name='Edited display' and name_zh='已編輯公開名稱' and official_name='Official name' and captured_name='Private name'
  from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Display edits persist with official and captured values present');

select pg_temp.assert(not has_function_privilege(role_name,'public.save_equipment_captured_names(uuid,timestamptz,text,text)','EXECUTE')
  and not has_column_privilege(role_name,'public.equipment','captured_name','SELECT')
  and not has_column_privilege(role_name,'public.equipment','captured_name_zh','SELECT'),
  'Captured names remain private') from unnest(array['anon','authenticated']) role_name;

select updated_at as previous_updated_at from public.equipment where id='00000000-0065-4000-8000-000000000002' \gset
set local role service_role;
select public.save_equipment_captured_names('00000000-0065-4000-8000-000000000002', :'previous_updated_at', ' Edited captured ', ' ');
reset role;
select pg_temp.assert((select name='Edited display' and name_zh='已編輯公開名稱' and official_name='Official name'
  and captured_name='Edited captured' and captured_name_zh is null
  from public.equipment where id='00000000-0065-4000-8000-000000000002'),'Authorized captured edits only update captured names');

do $$
begin
  perform public.save_equipment_captured_names('00000000-0065-4000-8000-000000000002', '2000-01-01 UTC', 'Stale', '');
  raise exception 'Expected a stale write to fail';
exception when others then
  if sqlerrm <> 'Stale equipment source names' then raise; end if;
end $$;
rollback;
