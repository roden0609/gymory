-- Assignments are canonical. equipment.equipment_type_code/category_id remain
-- transactionally maintained compatibility columns during the rollout.
create table public.equipment_type_assignments (
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  equipment_type_code text not null references public.equipment_types(code) on delete restrict,
  is_primary boolean not null default false,
  source text not null default 'admin' check (source in ('legacy', 'admin', '247-fitness')),
  verified_status text not null default 'unverified'
    check (verified_status in ('unverified', 'admin_verified', 'owner_verified')),
  verified_at timestamptz,
  constraint equipment_assignment_verification_metadata check (verified_status = 'unverified' or verified_at is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (equipment_id, equipment_type_code)
);
create unique index equipment_one_primary_type on public.equipment_type_assignments(equipment_id) where is_primary;
create index equipment_assignments_by_type on public.equipment_type_assignments(equipment_type_code, equipment_id);
insert into public.equipment_type_assignments(equipment_id, equipment_type_code, is_primary, source)
select id, equipment_type_code, true, case when import_method = 'admin' then 'admin' else 'legacy' end from public.equipment;

alter table public.equipment_type_assignments enable row level security;
create policy "Public can read active machine assignments" on public.equipment_type_assignments
for select to anon, authenticated using (
  exists(select 1 from public.equipment e where e.id = equipment_id)
  and exists(select 1 from public.equipment_types t join public.equipment_categories c on c.slug=replace(t.category,'_','-')
    where t.code = equipment_type_code and t.is_active and c.is_active)
);
revoke all on public.equipment_type_assignments from anon, authenticated;
grant select on public.equipment_type_assignments to anon, authenticated;
grant select, insert, update, delete on public.equipment_type_assignments to service_role;

create function public.lock_equipment_assignment() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (old.equipment_id, old.equipment_type_code) is distinct from (new.equipment_id, new.equipment_type_code) then
    raise exception 'Assignment identity is immutable; delete and insert instead';
  end if;
  perform 1 from public.equipment where id = case when tg_op = 'DELETE' then old.equipment_id else new.equipment_id end for update;
  if tg_op <> 'DELETE' then
    if not exists(select 1 from public.equipment_types where code = new.equipment_type_code and is_active) then
      raise exception 'Unknown or inactive equipment type';
    end if;
    new.updated_at := now();
    return new;
  end if;
  return old;
end $$;
create trigger trg_lock_equipment_assignment before insert or update or delete on public.equipment_type_assignments
for each row execute function public.lock_equipment_assignment();

create function public.check_equipment_primary_assignment() returns trigger
language plpgsql set search_path = public as $$
declare target_id uuid := case when tg_op = 'DELETE' then old.equipment_id else new.equipment_id end;
begin
  if exists(select 1 from public.equipment where id = target_id) and not exists(
    select 1 from public.equipment_type_assignments a join public.equipment e on e.id = a.equipment_id
    where a.equipment_id = target_id and a.is_primary and a.equipment_type_code = e.equipment_type_code
  ) then raise exception 'Equipment must have exactly one primary assignment matching its compatibility column'; end if;
  return null;
end $$;
create constraint trigger trg_check_equipment_primary_assignment after insert or update or delete
on public.equipment_type_assignments deferrable initially deferred
for each row execute function public.check_equipment_primary_assignment();

create function public.sync_legacy_equipment_primary() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.equipment_type_assignments where equipment_id = new.id and is_primary and equipment_type_code = new.equipment_type_code) then
    delete from public.equipment_type_assignments where equipment_id = new.id and is_primary;
    insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source)
    values(new.id,new.equipment_type_code,true,case when new.import_method = 'admin' then 'admin' else 'legacy' end)
    on conflict(equipment_id,equipment_type_code) do update set is_primary = true;
  end if;
  return null;
end $$;
create trigger trg_sync_legacy_equipment_primary after insert or update of equipment_type_code on public.equipment
for each row execute function public.sync_legacy_equipment_primary();

-- Both generic-equipment search and derived presence now include every assignment.
create or replace function public.gym_type_has_public_models(p_gym_id uuid, p_code text)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.gym_equipment_inventory i
    join public.equipment e on e.id = i.equipment_id
    join public.equipment_type_assignments a on a.equipment_id = e.id and a.equipment_type_code = p_code
    join public.equipment_brands b on b.id = e.brand_id
    join public.equipment_types t on t.code = a.equipment_type_code
    join public.equipment_categories c on c.slug = replace(t.category, '_', '-')
    where i.gym_id = p_gym_id and i.verified_status in ('admin_verified','owner_verified')
      and e.status = 'active' and b.is_active and c.is_active and t.is_active
  );
$$;
create or replace function public.sync_gym_model_type(p_gym_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code is null then return; end if;
  perform 1 from public.gyms where id = p_gym_id for no key update;
  if not found then return; end if;
  if exists(select 1 from public.gym_equipment_inventory i join public.equipment_type_assignments a on a.equipment_id = i.equipment_id
    where i.gym_id = p_gym_id and a.equipment_type_code = p_code) then
    insert into public.gym_equipment_type_inventory(gym_id,equipment_code,is_present,quantity,is_directly_reported)
    values(p_gym_id,p_code,true,null,false) on conflict(gym_id,equipment_code) do nothing;
  else
    delete from public.gym_equipment_type_inventory where gym_id = p_gym_id and equipment_code = p_code and not is_directly_reported;
  end if;
end $$;
create or replace function public.sync_gym_model_type_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare target record;
begin
  if tg_op <> 'INSERT' then
    for target in select equipment_type_code from public.equipment_type_assignments where equipment_id = old.equipment_id order by equipment_type_code loop
      perform public.sync_gym_model_type(old.gym_id,target.equipment_type_code);
    end loop;
  end if;
  if tg_op <> 'DELETE' then
    for target in select equipment_type_code from public.equipment_type_assignments where equipment_id = new.equipment_id order by equipment_type_code loop
      perform public.sync_gym_model_type(new.gym_id,target.equipment_type_code);
    end loop;
  end if;
  return null;
end $$;
drop trigger trg_changed_model_type_sync on public.equipment;
create function public.sync_equipment_assignment_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_id uuid := case when tg_op = 'DELETE' then old.equipment_id else new.equipment_id end;
  primary_code text; target record;
begin
  select equipment_type_code into primary_code from public.equipment_type_assignments where equipment_id = target_id and is_primary;
  if primary_code is not null then
    update public.equipment set equipment_type_code = primary_code where id = target_id and equipment_type_code is distinct from primary_code;
  end if;
  for target in select gym_id from public.gym_equipment_inventory where equipment_id = target_id order by gym_id loop
    perform public.sync_gym_model_type(target.gym_id,case when tg_op = 'DELETE' then old.equipment_type_code else new.equipment_type_code end);
  end loop;
  return null;
end $$;
create trigger trg_equipment_assignment_change after insert or update or delete on public.equipment_type_assignments
for each row execute function public.sync_equipment_assignment_change();

-- Atomic assignment edits are backend-only; the row lock serializes concurrent
-- primary changes and the composite PK prevents counting the same capability twice.
create function public.set_equipment_type_assignments(p_equipment_id uuid,p_primary_code text,p_additional_codes text[] default '{}')
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform 1 from public.equipment where id = p_equipment_id for update;
  if not found then raise exception 'Equipment not found'; end if;
  if p_primary_code is null or p_additional_codes is null or array_position(p_additional_codes,null) is not null
    or p_primary_code = any(p_additional_codes) then raise exception 'Invalid primary/additional assignments'; end if;
  if exists(select code from unnest(array[p_primary_code] || p_additional_codes) as codes(code)
    where not exists(select 1 from public.equipment_types t where t.code = codes.code and t.is_active)) then
    raise exception 'Unknown or inactive equipment type';
  end if;
  delete from public.equipment_type_assignments where equipment_id = p_equipment_id;
  insert into public.equipment_type_assignments(equipment_id,equipment_type_code,is_primary,source,verified_status,verified_at)
  select p_equipment_id,code,code = p_primary_code,'admin','admin_verified',now()
  from (select distinct unnest(array[p_primary_code] || p_additional_codes) code) codes;
end $$;

create function public.sync_247_equipment_type_assignments(p_equipment_id uuid,p_source_external_id text,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns integer language plpgsql security invoker set search_path = public as $$
declare machine public.equipment; changed integer := 0; added integer;
begin
  select * into machine from public.equipment where id = p_equipment_id for update;
  if not found or machine.source_external_id is distinct from p_source_external_id
    or p_source_external_id not like '247-fitness:%' or machine.equipment_type_code is distinct from p_primary_code then return 0; end if;
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

-- Guard primary reclassification and additional capabilities in one transaction.
create function public.apply_247_equipment_classification(p_equipment_id uuid,p_source_external_id text,p_primary_code text,p_additional_codes text[],p_verified boolean default false)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare machine public.equipment; reclassified integer := 0; assignments_changed integer := 0;
begin
  select * into machine from public.equipment where id=p_equipment_id for update;
  if not found or machine.source_external_id is distinct from p_source_external_id
    or p_source_external_id not like '247-fitness:%' or p_primary_code = 'other_equipment'
    or machine.equipment_type_code not in ('other_equipment',p_primary_code)
    or exists(select 1 from public.equipment_type_assignments where equipment_id=p_equipment_id and is_primary and source='admin') then
    return jsonb_build_object('reclassified',0,'assignments_changed',0);
  end if;
  if machine.equipment_type_code='other_equipment' then
    update public.equipment set equipment_type_code=p_primary_code where id=p_equipment_id;
    reclassified := 1;
  end if;
  assignments_changed := public.sync_247_equipment_type_assignments(p_equipment_id,p_source_external_id,p_primary_code,p_additional_codes,p_verified);
  return jsonb_build_object('reclassified',reclassified,'assignments_changed',assignments_changed);
end $$;
revoke all on function public.apply_247_equipment_classification(uuid,text,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.apply_247_equipment_classification(uuid,text,text,text[],boolean) to service_role;

-- Save the catalog record, assignments and aliases together so a validation or
-- assignment failure cannot leave the legacy primary column partially changed.
create function public.save_equipment_catalog_machine(p_id uuid,p_machine jsonb,p_additional_codes text[],p_aliases text[])
returns uuid language plpgsql security invoker set search_path = public as $$
declare target_id uuid := coalesce(p_id,gen_random_uuid());
begin
  if p_id is null then
    insert into public.equipment(id,brand_id,equipment_type_code,name,name_zh,slug,series,model_number,labels,product_url,description,status,source_type,import_method)
    values(target_id,(p_machine->>'brand_id')::uuid,p_machine->>'equipment_type_code',p_machine->>'name',p_machine->>'name_zh',p_machine->>'slug',p_machine->>'series',p_machine->>'model_number',
      array(select jsonb_array_elements_text(p_machine->'labels')),p_machine->>'product_url',p_machine->>'description',p_machine->>'status',p_machine->>'source_type','admin');
  else
    update public.equipment set brand_id=(p_machine->>'brand_id')::uuid,name=p_machine->>'name',name_zh=p_machine->>'name_zh',slug=p_machine->>'slug',series=p_machine->>'series',model_number=p_machine->>'model_number',
      labels=array(select jsonb_array_elements_text(p_machine->'labels')),product_url=p_machine->>'product_url',description=p_machine->>'description',status=p_machine->>'status',source_type=p_machine->>'source_type',import_method='admin'
    where id=target_id;
    if not found then raise exception 'Equipment not found'; end if;
  end if;
  perform public.set_equipment_type_assignments(target_id,p_machine->>'equipment_type_code',p_additional_codes);
  delete from public.equipment_aliases where equipment_id=target_id;
  insert into public.equipment_aliases(equipment_id,alias) select target_id,alias from (select distinct unnest(p_aliases) alias) aliases;
  return target_id;
end $$;

revoke all on function public.set_equipment_type_assignments(uuid,text,text[]) from public,anon,authenticated;
revoke all on function public.sync_247_equipment_type_assignments(uuid,text,text,text[],boolean) from public,anon,authenticated;
revoke all on function public.save_equipment_catalog_machine(uuid,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.set_equipment_type_assignments(uuid,text,text[]) to service_role;
grant execute on function public.sync_247_equipment_type_assignments(uuid,text,text,text[],boolean) to service_role;
grant execute on function public.save_equipment_catalog_machine(uuid,jsonb,text[],text[]) to service_role;
revoke all on function public.sync_legacy_equipment_primary() from public,anon,authenticated;
revoke all on function public.sync_equipment_assignment_change() from public,anon,authenticated;
revoke all on function public.lock_equipment_assignment() from public,anon,authenticated;
revoke all on function public.check_equipment_primary_assignment() from public,anon,authenticated;
notify pgrst, 'reload schema';
