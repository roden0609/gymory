-- Run after 0058 with psql -v ON_ERROR_STOP=1 -f this file.
-- Fixtures, mutations, and deletions all roll back.
begin;
create function pg_temp.assert(p_condition boolean, p_message text) returns void
language plpgsql as $$ begin if p_condition is not true then raise exception '%', p_message; end if; end $$;

select pg_temp.assert(has_table_privilege('service_role', 'public.equipment_types', 'INSERT') and has_table_privilege('service_role', 'public.equipment_types', 'UPDATE') and has_table_privilege('service_role', 'public.equipment_types', 'DELETE'), 'Backend must be able to manage types');
select pg_temp.assert(not has_table_privilege('authenticated', 'public.equipment_types', 'DELETE'), 'Public authenticated role must not delete types');

insert into public.equipment_types (code, name_en, category)
values ('admin_test_type_0058', 'Admin test type', 'other');
insert into public.equipment_brands (id, name_en, slug)
values ('00000000-0058-4000-8000-000000000001', 'Admin type test', 'admin-type-test-0058');
insert into public.equipment (id, brand_id, equipment_type_code, name, slug, source_type)
values ('00000000-0058-4000-8000-000000000002', '00000000-0058-4000-8000-000000000001', 'admin_test_type_0058', 'Test model', 'test-model-0058', 'manual');

update public.equipment_types set category = 'cardio', name_en = 'Updated test type' where code = 'admin_test_type_0058';
select pg_temp.assert((select c.slug = 'cardio' from public.equipment e join public.equipment_categories c on c.id = e.category_id where e.id = '00000000-0058-4000-8000-000000000002'), 'Type category updates must propagate to models');

do $$ begin
  begin
    delete from public.equipment_types where code = 'admin_test_type_0058';
    raise exception 'Deleting a type with equipment must fail';
  exception when foreign_key_violation then null;
  end;
end $$;

delete from public.equipment where id = '00000000-0058-4000-8000-000000000002';
delete from public.equipment_types where code = 'admin_test_type_0058';
select pg_temp.assert(not exists (select 1 from public.equipment_types where code = 'admin_test_type_0058'), 'An empty type must be deletable');
rollback;
