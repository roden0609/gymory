-- Cut over to assignments as the only stored machine classification.
-- No CASCADE: fail rather than silently remove an unknown column dependency.
create function public.equipment_primary_category_is_active(p_equipment_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.equipment_type_assignments a
    join public.equipment_types t on t.code=a.equipment_type_code
    join public.equipment_categories c on c.slug=replace(t.category,'_','-')
    where a.equipment_id=p_equipment_id and a.is_primary and t.is_active and c.is_active);
$$;
revoke all on function public.equipment_primary_category_is_active(uuid) from public;
grant execute on function public.equipment_primary_category_is_active(uuid) to anon,authenticated,service_role;
-- The definer helper avoids equipment -> assignments -> equipment RLS recursion.
alter policy "Public can read active equipment machines" on public.equipment using (
  status='active'
  and exists(select 1 from public.equipment_brands b where b.id=equipment.brand_id and b.is_active)
  and public.equipment_primary_category_is_active(id)
);

drop trigger trg_sync_legacy_equipment_primary on public.equipment;
drop function public.sync_legacy_equipment_primary();
drop trigger trg_equipment_category_from_type on public.equipment;
drop function public.set_equipment_category_from_type();
drop trigger trg_equipment_type_category_sync on public.equipment_types;
drop function public.sync_equipment_category_after_type_update();
drop function public.sync_changed_model_type_trigger();

create or replace function public.check_equipment_primary_assignment() returns trigger
language plpgsql set search_path=public as $$
declare target_id uuid := case when tg_op='DELETE' then old.equipment_id else new.equipment_id end;
begin
  if exists(select 1 from public.equipment where id=target_id)
    and not exists(select 1 from public.equipment_type_assignments where equipment_id=target_id and is_primary) then
    raise exception 'Equipment must have exactly one primary assignment';
  end if;
  return null;
end $$;
create function public.check_new_equipment_primary() returns trigger
language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.equipment where id=new.id)
    and not exists(select 1 from public.equipment_type_assignments where equipment_id=new.id and is_primary) then
    raise exception 'Equipment must have exactly one primary assignment';
  end if;
  return null;
end $$;
create constraint trigger trg_check_new_equipment_primary after insert on public.equipment
  deferrable initially deferred for each row execute function public.check_new_equipment_primary();
revoke all on function public.check_new_equipment_primary() from public,anon,authenticated;

create or replace function public.sync_equipment_assignment_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_id uuid := case when tg_op='DELETE' then old.equipment_id else new.equipment_id end;
  target record;
begin
  for target in select gym_id from public.gym_equipment_inventory where equipment_id=target_id order by gym_id loop
    perform public.sync_gym_model_type(target.gym_id,case when tg_op='DELETE' then old.equipment_type_code else new.equipment_type_code end);
  end loop;
  return null;
end $$;

create or replace function public.sync_247_equipment_type_assignments(p_equipment_id uuid,p_source_external_id text,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns integer language plpgsql security invoker set search_path = public as $$
declare machine public.equipment; changed integer := 0; added integer; current_primary text;
begin
  select * into machine from public.equipment where id = p_equipment_id for update;
  if not found then return 0; end if;
  select equipment_type_code into current_primary from public.equipment_type_assignments where equipment_id=p_equipment_id and is_primary;
  if machine.source_external_id is distinct from p_source_external_id
    or p_source_external_id not like '247-fitness:%' or current_primary is distinct from p_primary_code then return 0; end if;
  if exists(select 1 from public.equipment_type_assignments where equipment_id = p_equipment_id and source = 'admin' and is_primary) then return 0; end if;
  if p_additional_codes is null or array_position(p_additional_codes,null) is not null or p_primary_code = any(p_additional_codes) then raise exception 'Invalid additional assignments'; end if;
  if exists(select code from unnest(p_additional_codes) as codes(code) where not exists(select 1 from public.equipment_types t where t.code = codes.code and t.is_active)) then raise exception 'Unknown or inactive equipment type'; end if;
  delete from public.equipment_type_assignments where equipment_id = p_equipment_id and not is_primary and source = '247-fitness' and not (equipment_type_code = any(p_additional_codes));
  get diagnostics changed = row_count;
  insert into public.equipment_type_assignments(equipment_id,equipment_type_code,source,verified_status,verified_at)
  select p_equipment_id,code,'247-fitness',case when p_verified then 'admin_verified' else 'unverified' end,case when p_verified then now() end
  from (select distinct unnest(p_additional_codes) code) codes on conflict do nothing;
  get diagnostics added = row_count;
  update public.equipment_type_assignments set source = '247-fitness',
    verified_status = case when p_verified then 'admin_verified' else verified_status end,
    verified_at = case when p_verified then coalesce(verified_at,now()) else verified_at end
  where equipment_id = p_equipment_id and (is_primary or source = '247-fitness') and source <> 'admin'
    and (source <> '247-fitness' or (p_verified and verified_status <> 'admin_verified'));
  return changed + added;
end $$;


create or replace function public.apply_247_equipment_classification(p_equipment_id uuid,p_source_external_id text,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare machine public.equipment; reclassified integer := 0; assignments_changed integer := 0; current_primary text;
begin
  select * into machine from public.equipment where id=p_equipment_id for update;
  if not found then return jsonb_build_object('reclassified',0,'assignments_changed',0); end if;
  select equipment_type_code into current_primary from public.equipment_type_assignments where equipment_id=p_equipment_id and is_primary;
  if machine.source_external_id is distinct from p_source_external_id
    or p_source_external_id not like '247-fitness:%' or p_primary_code = 'other_equipment'
    or current_primary is null or current_primary not in ('other_equipment',p_primary_code)
    or exists(select 1 from public.equipment_type_assignments where equipment_id=p_equipment_id and is_primary and source='admin') then
    return jsonb_build_object('reclassified',0,'assignments_changed',0);
  end if;
  if current_primary='other_equipment' then
    delete from public.equipment_type_assignments where equipment_id=p_equipment_id and is_primary;
    insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source)
    values(p_equipment_id,p_primary_code,true,'247-fitness')
    on conflict(equipment_id,equipment_type_code) do update set is_primary=true;
    reclassified := 1;
  end if;
  assignments_changed := public.sync_247_equipment_type_assignments(p_equipment_id,p_source_external_id,p_primary_code,p_additional_codes,p_verified);
  return jsonb_build_object('reclassified',reclassified,'assignments_changed',assignments_changed);
end $$;
revoke all on function public.apply_247_equipment_classification(uuid,text,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.apply_247_equipment_classification(uuid,text,text,text[],boolean) to service_role;


create or replace function public.save_equipment_catalog_machine(p_id uuid,p_machine jsonb,p_additional_codes text[],p_aliases text[])
returns uuid language plpgsql security invoker set search_path = public as $$
declare target_id uuid := coalesce(p_id,gen_random_uuid());
begin
  if p_id is null then
    insert into public.equipment(id,brand_id,name,name_zh,slug,series,model_number,labels,product_url,description,status,source_type,import_method)
    values(target_id,(p_machine->>'brand_id')::uuid,p_machine->>'name',p_machine->>'name_zh',p_machine->>'slug',p_machine->>'series',p_machine->>'model_number',
      array(select jsonb_array_elements_text(p_machine->'labels')),p_machine->>'product_url',p_machine->>'description',p_machine->>'status',p_machine->>'source_type','admin');
  else
    update public.equipment set brand_id=(p_machine->>'brand_id')::uuid,name=p_machine->>'name',name_zh=p_machine->>'name_zh',slug=p_machine->>'slug',series=p_machine->>'series',model_number=p_machine->>'model_number',
      labels=array(select jsonb_array_elements_text(p_machine->'labels')),product_url=p_machine->>'product_url',description=p_machine->>'description',status=p_machine->>'status',source_type=p_machine->>'source_type',import_method='admin'
    where id=target_id;
    if not found then raise exception 'Equipment not found'; end if;
  end if;
  perform public.set_equipment_type_assignments(target_id,p_machine->>'primary_type_code',p_additional_codes);
  delete from public.equipment_aliases where equipment_id=target_id;
  insert into public.equipment_aliases(equipment_id,alias) select target_id,alias from (select distinct unnest(p_aliases) alias) aliases;
  return target_id;
end $$;


-- Creation must include a primary assignment in the same transaction; a REST
-- INSERT followed by a separate request would leave an invalid machine at commit.
create function public.create_247_equipment_model(p_machine jsonb,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare machine public.equipment;
begin
  if coalesce(p_machine->>'source_external_id','') not like '247-fitness:%' then raise exception 'Invalid importer identity'; end if;
  insert into public.equipment(brand_id,name,name_zh,slug,model_number,source_external_id,source_type,import_method,source_url,imported_at,status)
  values((p_machine->>'brand_id')::uuid,p_machine->>'name',p_machine->>'name_zh',p_machine->>'slug',p_machine->>'model_number',
    p_machine->>'source_external_id','official','seed',p_machine->>'source_url',(p_machine->>'imported_at')::timestamptz,'active') returning * into machine;
  insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source)
  values(machine.id,p_primary_code,true,'247-fitness');
  perform public.sync_247_equipment_type_assignments(machine.id,machine.source_external_id,p_primary_code,p_additional_codes,p_verified);
  return to_jsonb(machine) || jsonb_build_object('equipment_type_assignments',(
    select jsonb_agg(jsonb_build_object('equipment_type_code',equipment_type_code,'is_primary',is_primary))
    from public.equipment_type_assignments where equipment_id=machine.id
  ));
end $$;
revoke all on function public.create_247_equipment_model(jsonb,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.create_247_equipment_model(jsonb,text,text[],boolean) to service_role;

alter table public.equipment drop column equipment_type_code, drop column category_id;
notify pgrst,'reload schema';
