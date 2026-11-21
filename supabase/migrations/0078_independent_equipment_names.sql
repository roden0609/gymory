begin;

drop trigger trg_equipment_display_names on public.equipment;
drop function public.sync_equipment_display_names();

-- Reset values that may have been populated by the private-name fallback.
-- A verified official value that happens to match the source is independently confirmed.
with affected as (
  select id,
    name = nullif(btrim(captured_name), '') and
      (official_verified_at is null or name is distinct from nullif(btrim(official_name), '')) as reset_en,
    name_zh = nullif(btrim(captured_name_zh), '') and
      (official_verified_at is null or name_zh is distinct from nullif(btrim(official_name_zh), '')) as reset_zh
  from public.equipment
)
update public.equipment e set
  name = case when affected.reset_en then concat_ws(' ', 'Equipment', nullif(btrim(e.model_number), '')) else e.name end,
  name_zh = case when affected.reset_zh then null else e.name_zh end
from affected
where e.id = affected.id and (affected.reset_en or affected.reset_zh);

comment on column public.equipment.name is 'Public English display name curated independently of source and official names.';
comment on column public.equipment.name_zh is 'Public Traditional Chinese display name curated independently of source and official names.';
comment on column public.equipment.captured_name is 'Private English source-name record, editable by authorized admins.';
comment on column public.equipment.captured_name_zh is 'Private Traditional Chinese source-name record, editable by authorized admins.';

create function public.save_equipment_captured_names(
  p_id uuid, p_expected_updated_at timestamptz, p_name text, p_name_zh text
) returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.equipment set
    captured_name = nullif(btrim(p_name), ''),
    captured_name_zh = nullif(btrim(p_name_zh), '')
  where id = p_id and updated_at = p_expected_updated_at;
  if not found then raise exception 'Stale equipment source names'; end if;
end $$;
revoke all on function public.save_equipment_captured_names(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.save_equipment_captured_names(uuid,timestamptz,text,text) to service_role;

-- Keep the previous signature callable during deployment. Display edits use the catalog RPC.
create or replace function public.save_equipment_official_review(p_id uuid, p_expected_updated_at timestamptz,
  p_name text, p_model text, p_product_url text, p_status text, p_note text, p_verify boolean, p_actor text,
  p_name_zh text default null, p_apply_names boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare current_updated_at timestamptz;
begin
  select updated_at into strict current_updated_at from public.equipment where id=p_id for update;
  if current_updated_at is distinct from p_expected_updated_at then raise exception 'Stale equipment review'; end if;
  if p_apply_names then
    raise exception 'Edit display names in the catalog form';
  end if;
  update public.equipment set official_name=nullif(btrim(p_name),''),
    official_name_zh=case when p_name_zh is null then official_name_zh else nullif(btrim(p_name_zh),'') end,
    official_model_number=nullif(btrim(p_model),''),
    official_product_url=nullif(btrim(p_product_url),''),official_status=p_status,official_review_note=nullif(btrim(p_note),'')
    where id=p_id;
  if p_verify and (nullif(btrim(p_actor),'') is null or nullif(btrim(p_name),'') is null) then
    raise exception 'Verified official data requires a name and admin identity';
  end if;
  update public.equipment set official_verified_at=case when p_verify then clock_timestamp() else null end,
    official_verified_by=case when p_verify then p_actor else null end where id=p_id;
end $$;

create or replace function public.create_247_equipment_model(p_machine jsonb,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare machine_id uuid;
begin
  if coalesce(p_machine->>'source_external_id','') not like '247-fitness:%' then raise exception 'Invalid importer identity'; end if;
  insert into public.equipment(brand_id,name,name_zh,captured_name,captured_name_zh,slug,model_number,source_external_id,source_type,import_method,source_url,imported_at,status)
  values((p_machine->>'brand_id')::uuid,
    concat_ws(' ', 'Equipment', nullif(btrim(p_machine->>'model_number'),'')),null,
    p_machine->>'name',p_machine->>'name_zh','equipment',p_machine->>'model_number',
    p_machine->>'source_external_id','official','seed',p_machine->>'source_url',(p_machine->>'imported_at')::timestamptz,'active') returning id into machine_id;
  insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source)
  values(machine_id,p_primary_code,true,'247-fitness');
  perform public.sync_247_equipment_type_assignments(machine_id,p_machine->>'source_external_id',p_primary_code,p_additional_codes,p_verified);
  return jsonb_build_object('id',machine_id,'source_external_id',p_machine->>'source_external_id','equipment_type_assignments',(
    select jsonb_agg(jsonb_build_object('equipment_type_code',equipment_type_code,'is_primary',is_primary))
    from public.equipment_type_assignments where equipment_id=machine_id
  ));
end $$;

notify pgrst, 'reload schema';

commit;
