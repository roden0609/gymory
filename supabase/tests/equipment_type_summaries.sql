-- Run after 0054 with psql -v ON_ERROR_STOP=1 -f this file.
-- Every fixture and mutation rolls back.
begin;
create function pg_temp.assert(p_condition boolean, p_message text) returns void
language plpgsql as $$ begin if p_condition is not true then raise exception '%', p_message; end if; end $$;

insert into public.gyms (id, name, slug, district_code)
values ('00000000-0054-4000-8000-000000000001', 'Catalog test', 'catalog-test-0054', 'HK-CW');
insert into public.equipment_brands (id, name_en, slug)
values ('00000000-0054-4000-8000-000000000002', 'Catalog test', 'catalog-test-0054');
insert into public.equipment (id, brand_id, equipment_type_code, name, slug, source_type, status, labels)
values
 ('00000000-0054-4000-8000-000000000003', '00000000-0054-4000-8000-000000000002', 'chest_press_machine', 'Test press', 'test-press', 'manual', 'active', array['plate-loaded']),
 ('00000000-0054-4000-8000-000000000004', '00000000-0054-4000-8000-000000000002', 'chest_press_machine', 'Second press', 'second-press', 'manual', 'active', array['selectorized']);
select pg_temp.assert((select c.slug='chest' from public.equipment e join public.equipment_categories c on c.id=e.category_id where e.id='00000000-0054-4000-8000-000000000003'), 'Model category must follow its type');
select pg_temp.assert((select count(*)=11 from public.equipment_categories), 'Expected eleven categories');
select pg_temp.assert((select labels=array['hyrox'] from public.equipment_types where code='ski_erg'), 'SkiErg must have predefined HYROX label');
select pg_temp.assert((select labels='{}'::text[] from public.equipment_types where code='chest_press_machine'), 'Do not copy mechanism label into generic type');

insert into public.gym_equipment_inventory (gym_id, equipment_id, quantity, source, verified_status)
values ('00000000-0054-4000-8000-000000000001', '00000000-0054-4000-8000-000000000003', 2, 'user', 'unverified');
select pg_temp.assert((select count(*)=1 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001' and equipment_code='chest_press_machine' and not is_directly_reported and quantity is null), 'Pending model must create a derived summary without quantity');
set local role anon;
select pg_temp.assert((select count(*)=0 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Pending derived summary leaked through RLS');
select pg_temp.assert((select has_chest_press_machine is null from public.gyms_normalized where id='00000000-0054-4000-8000-000000000001'), 'Pending model leaked through compatibility view');
reset role;
select pg_temp.assert(not public.gym_matches_equipment_requirements('00000000-0054-4000-8000-000000000001', '[{"equipmentCode":"chest_press_machine"}]'), 'Pending model leaked through backend search predicate');
update public.gym_equipment_inventory set verified_status='owner_verified', verified_at=now()
where gym_id='00000000-0054-4000-8000-000000000001';
set local role anon;
select pg_temp.assert((select count(*)=1 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Verified model must publish its derived type');
reset role;
insert into public.gym_equipment_inventory (gym_id, equipment_id, quantity, source, verified_status, verified_at)
values ('00000000-0054-4000-8000-000000000001', '00000000-0054-4000-8000-000000000004', 3, 'admin', 'admin_verified', now());
select pg_temp.assert((select count(*)=1 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Models of same type must not duplicate summaries');
select pg_temp.assert((select quantity is null from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Model quantities must not be summed into type');

-- Revocation hides a derived type only after its last public model is revoked.
update public.gym_equipment_inventory set verified_status='unverified' where gym_id='00000000-0054-4000-8000-000000000001';
set local role anon;
select pg_temp.assert((select count(*)=0 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Revoked models must hide derived summary');
reset role;
update public.gym_equipment_inventory set verified_status='admin_verified', verified_at=now() where gym_id='00000000-0054-4000-8000-000000000001';

-- Direct data takes ownership; deleting models must preserve it.
select public.apply_gym_equipment_type_inventory_items('00000000-0054-4000-8000-000000000001', '[{"equipmentCode":"chest_press_machine","quantity":7}]');
select pg_temp.assert((select is_directly_reported and quantity=7 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Direct edit must retain its independent quantity');
delete from public.gym_equipment_inventory where gym_id='00000000-0054-4000-8000-000000000001';
select pg_temp.assert((select is_directly_reported and quantity=7 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Deleting last model must preserve direct report');

-- Removing direct data while a model remains restores a derived summary.
insert into public.gym_equipment_inventory (gym_id, equipment_id, source, verified_status, verified_at)
values ('00000000-0054-4000-8000-000000000001', '00000000-0054-4000-8000-000000000003', 'admin', 'admin_verified', now());
select public.apply_gym_equipment_type_inventory_items('00000000-0054-4000-8000-000000000001', '[{"equipmentCode":"chest_press_machine","remove":true}]');
select pg_temp.assert((select not is_directly_reported and quantity is null from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Removing direct report must restore derived summary');

-- Relinking a model removes only the old derived summary.
update public.equipment set equipment_type_code='shoulder_press_machine' where id='00000000-0054-4000-8000-000000000003';
select pg_temp.assert((select count(*)=0 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001' and equipment_code='chest_press_machine'), 'Relinking must clean old derived type');
select pg_temp.assert((select count(*)=1 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001' and equipment_code='shoulder_press_machine'), 'Relinking must create new type');
delete from public.gym_equipment_inventory where gym_id='00000000-0054-4000-8000-000000000001';
select pg_temp.assert((select count(*)=0 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Deleting last model must remove derived summary');

-- Catalog deletion also cleans derived summaries before FK cascades.
insert into public.gym_equipment_inventory (gym_id, equipment_id, source, verified_status, verified_at)
values ('00000000-0054-4000-8000-000000000001', '00000000-0054-4000-8000-000000000004', 'admin', 'admin_verified', now());
update public.equipment set status='unknown' where id='00000000-0054-4000-8000-000000000004';
select pg_temp.assert(not public.gym_type_has_public_models('00000000-0054-4000-8000-000000000001','chest_press_machine'), 'Non-public catalog model must not publish a type through backend');
delete from public.equipment where id='00000000-0054-4000-8000-000000000004';
select pg_temp.assert((select count(*)=0 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Catalog deletion must remove orphaned derived summary');

-- Type-only reporting remains independent of models.
select public.apply_gym_equipment_type_inventory_items('00000000-0054-4000-8000-000000000001', '[{"equipmentCode":"ski_erg","isPresent":true}]');
set local role anon;
select pg_temp.assert((select count(*)=1 from public.gym_equipment_type_inventory where gym_id='00000000-0054-4000-8000-000000000001'), 'Type-only report must remain public');
reset role;
-- Invalid labels and unlinked models cannot enter the catalog.
do $$ begin
  begin
    update public.equipment set labels=array['invented'] where id='00000000-0054-4000-8000-000000000003';
    raise exception 'Unknown label was accepted';
  exception when check_violation then null; end;
  begin
    update public.equipment set equipment_type_code=null where id='00000000-0054-4000-8000-000000000003';
    raise exception 'Unlinked model was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Unknown or inactive equipment type' then raise; end if;
  end;
end $$;

rollback;
