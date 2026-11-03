-- Display names, captured provenance and manufacturer names have distinct roles.
alter table public.equipment
  add column captured_name text,
  add column captured_name_zh text,
  add column official_name_zh text;
comment on column public.equipment.captured_name is 'Original source English name; populated from captured data, never inferred from display names.';
comment on column public.equipment.captured_name_zh is 'Original source Traditional Chinese name.';
comment on column public.equipment.official_name_zh is 'Manufacturer-provided Traditional Chinese name; not an inferred or manual translation.';
comment on column public.equipment.name is 'Gymory English display name, independently curated.';
comment on column public.equipment.name_zh is 'Gymory Traditional Chinese display name, independently curated.';
-- No guessed backfill: use the source catalog/importer to populate captured names.
create or replace function public.invalidate_equipment_official_review() returns trigger
language plpgsql set search_path = public as $$
begin
  if row(new.brand_id,new.name,new.name_zh,new.model_number,new.product_url,new.source_external_id,
         new.official_name,new.official_name_zh,new.official_model_number,new.official_product_url,new.official_status,new.official_review_note)
     is distinct from
     row(old.brand_id,old.name,old.name_zh,old.model_number,old.product_url,old.source_external_id,
         old.official_name,old.official_name_zh,old.official_model_number,old.official_product_url,old.official_status,old.official_review_note) then
    new.official_verified_at := null;
    new.official_verified_by := null;
  end if;
  return new;
end $$;

drop function public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text);
create function public.save_equipment_official_review(p_id uuid, p_expected_updated_at timestamptz,
  p_name text, p_model text, p_product_url text, p_status text, p_note text, p_verify boolean, p_actor text,
  p_name_zh text default null, p_apply_names boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare machine public.equipment;
begin
  select * into strict machine from public.equipment where id=p_id for update;
  if machine.updated_at is distinct from p_expected_updated_at then raise exception 'Stale equipment review'; end if;
  update public.equipment set official_name=nullif(btrim(p_name),''),
    official_name_zh=case when p_name_zh is null then official_name_zh else nullif(btrim(p_name_zh),'') end,
    official_model_number=nullif(btrim(p_model),''),
    official_product_url=nullif(btrim(p_product_url),''),official_status=p_status,official_review_note=nullif(btrim(p_note),'')
    where id=p_id;
  if p_verify and (nullif(btrim(p_actor),'') is null or nullif(btrim(p_name),'') is null) then
    raise exception 'Verified official data requires a name and admin identity';
  end if;
  if p_apply_names then
    if not p_verify then raise exception 'Confirm official data before applying display names'; end if;
    update public.equipment set name=nullif(btrim(p_name),''),
      name_zh=coalesce(official_name_zh,name_zh) where id=p_id;
  end if;
  update public.equipment set official_verified_at=case when p_verify then clock_timestamp() else null end,
    official_verified_by=case when p_verify then p_actor else null end where id=p_id;
end $$;

create or replace function public.import_equipment_official_research(p_external_id text, p_source_model text,
  p_research jsonb, p_images jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare machine public.equipment; img jsonb;
begin
  select * into strict machine from public.equipment where source_external_id=p_external_id for update;
  if btrim(coalesce(machine.model_number,'')) <> btrim(coalesce(p_source_model,'')) then
    raise exception 'Research source model does not match equipment';
  end if;
  -- Fill provenance only from captured input, never from display or official names.
  update public.equipment set captured_name=coalesce(captured_name,p_research->>'captured_name'),
    captured_name_zh=coalesce(captured_name_zh,p_research->>'captured_name_zh')
    where id=machine.id and ((captured_name is null and p_research->>'captured_name' is not null)
      or (captured_name_zh is null and p_research->>'captured_name_zh' is not null));
  if machine.official_verified_at is not null then return 'skipped_verified'; end if;
  update public.equipment set official_name=p_research->>'name',
    official_name_zh=case when p_research ? 'name_zh' then p_research->>'name_zh' else official_name_zh end,official_model_number=p_research->>'model',
    official_product_url=p_research->>'product_url',official_status=p_research->>'status',
    official_review_note=p_research->>'note' where id=machine.id;
  for img in select value from jsonb_array_elements(p_images) loop
    insert into public.equipment_images(equipment_id,image_role,url,source_url,source_type,source_external_key)
      values(machine.id,img->>'role',img->>'url',img->>'source_url',
        case when img->>'role'='official' then 'official' else 'manual' end,p_external_id)
      on conflict (equipment_id,image_role,url) do nothing;
  end loop;
  return 'imported';
end $$;

create or replace function public.create_247_equipment_model(p_machine jsonb,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare machine public.equipment;
begin
  if coalesce(p_machine->>'source_external_id','') not like '247-fitness:%' then raise exception 'Invalid importer identity'; end if;
  insert into public.equipment(brand_id,name,name_zh,captured_name,captured_name_zh,slug,model_number,source_external_id,source_type,import_method,source_url,imported_at,status)
  values((p_machine->>'brand_id')::uuid,p_machine->>'name',p_machine->>'name_zh',p_machine->>'name',p_machine->>'name_zh',p_machine->>'slug',p_machine->>'model_number',
    p_machine->>'source_external_id','official','seed',p_machine->>'source_url',(p_machine->>'imported_at')::timestamptz,'active') returning * into machine;
  insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source)
  values(machine.id,p_primary_code,true,'247-fitness');
  perform public.sync_247_equipment_type_assignments(machine.id,machine.source_external_id,p_primary_code,p_additional_codes,p_verified);
  return to_jsonb(machine) || jsonb_build_object('equipment_type_assignments',(
    select jsonb_agg(jsonb_build_object('equipment_type_code',equipment_type_code,'is_primary',is_primary))
    from public.equipment_type_assignments where equipment_id=machine.id
  ));
end $$;

revoke all on function public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text,text,boolean) from public,anon,authenticated;
grant execute on function public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text,text,boolean) to service_role;
notify pgrst,'reload schema';
