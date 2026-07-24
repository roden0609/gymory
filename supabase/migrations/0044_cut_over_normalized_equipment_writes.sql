-- Move importer and submission approval equipment writes to the normalized
-- inventory model. Legacy gym equipment columns remain read-compatible during
-- the observation window but are no longer the canonical application write path.

create or replace function public.apply_gym_equipment_inventory_items(
  p_target_gym_id uuid,
  p_inventory_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  item_code text;
  item_present boolean;
  item_quantity integer;
begin
  if jsonb_typeof(p_inventory_items) <> 'array' then
    raise exception 'inventory_items must be a JSON array';
  end if;

  if not exists (select 1 from public.gyms where id = p_target_gym_id) then
    raise exception 'Gym not found';
  end if;

  for item in select value from jsonb_array_elements(p_inventory_items) loop
    item_code := item ->> 'equipmentCode';

    if item_code is null or not exists (
      select 1
      from public.equipment_types
      where code = item_code
        and is_active = true
    ) then
      raise exception 'Unknown or inactive equipment code: %', coalesce(item_code, '<null>');
    end if;

    if coalesce((item ->> 'remove')::boolean, false) then
      delete from public.gym_equipment_inventory
      where gym_id = p_target_gym_id
        and equipment_code = item_code;
      continue;
    end if;

    item_present := case
      when item ? 'isPresent' and item -> 'isPresent' <> 'null'::jsonb
        then (item ->> 'isPresent')::boolean
      else null
    end;
    item_quantity := case
      when item ? 'quantity' and item -> 'quantity' <> 'null'::jsonb
        then (item ->> 'quantity')::integer
      else null
    end;

    if item_present is null and item_quantity is null then
      raise exception 'Inventory item % must contain presence or quantity', item_code;
    end if;

    if item_quantity is not null and item_quantity < 0 then
      raise exception 'Inventory item % quantity cannot be negative', item_code;
    end if;

    if item_quantity is not null then
      item_present := item_quantity > 0;
    end if;

    insert into public.gym_equipment_inventory (
      gym_id,
      equipment_code,
      is_present,
      quantity
    )
    values (
      p_target_gym_id,
      item_code,
      item_present,
      item_quantity
    )
    on conflict (gym_id, equipment_code) do update
    set
      is_present = excluded.is_present,
      quantity = excluded.quantity,
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.apply_gym_equipment_inventory_patch(
  p_target_gym_id uuid,
  p_inventory_items jsonb,
  p_submitted_by_user_id uuid,
  p_reviewed_by_user_id uuid,
  p_source_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid := gen_random_uuid();
begin
  perform public.apply_gym_equipment_inventory_items(
    p_target_gym_id,
    p_inventory_items
  );

  update public.gyms
  set
    data_source = 'admin',
    updated_at = now()
  where id = p_target_gym_id;

  insert into public.gym_update_submissions (
    id,
    gym_id,
    submitted_by_user_id,
    submission_type,
    status,
    payload,
    reviewed_by_user_id,
    reviewed_at,
    changed_fields,
    action_type,
    actor_type
  )
  values (
    audit_id,
    p_target_gym_id,
    p_submitted_by_user_id,
    'edit_equipment',
    'approved',
    coalesce(
      p_source_payload,
      jsonb_build_object('schemaVersion', 2, 'equipment', p_inventory_items)
    ),
    p_reviewed_by_user_id,
    now(),
    jsonb_build_object('equipment', p_inventory_items),
    'U',
    'admin'
  );

  return audit_id;
end;
$$;

create or replace function public.apply_gym_equipment_import_patch(
  p_target_gym_id uuid,
  p_inventory_items jsonb,
  p_source_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid := gen_random_uuid();
begin
  perform public.apply_gym_equipment_inventory_items(
    p_target_gym_id,
    p_inventory_items
  );

  update public.gyms
  set
    data_source = 'import',
    last_reported_at = now(),
    updated_at = now()
  where id = p_target_gym_id;

  insert into public.gym_update_submissions (
    id,
    gym_id,
    submitted_by_user_id,
    submission_type,
    status,
    payload,
    reviewed_by_user_id,
    reviewed_at,
    changed_fields,
    action_type,
    actor_type,
    review_notes
  )
  values (
    audit_id,
    p_target_gym_id,
    null,
    'edit_equipment',
    'approved',
    coalesce(
      p_source_payload,
      jsonb_build_object('schemaVersion', 2, 'equipment', p_inventory_items)
    ),
    null,
    now(),
    jsonb_build_object('equipment', p_inventory_items),
    'U',
    'import',
    'Normalized equipment inventory import'
  );

  return audit_id;
end;
$$;

create or replace function public.approve_gym_equipment_submission_patch(
  p_submission_id uuid,
  p_target_gym_id uuid,
  p_inventory_items jsonb,
  p_reviewed_by_user_id uuid,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.gym_update_submissions
    where id = p_submission_id
      and status = 'pending'
  ) then
    raise exception 'Pending submission not found';
  end if;

  perform public.apply_gym_equipment_inventory_items(
    p_target_gym_id,
    p_inventory_items
  );

  update public.gyms
  set
    data_source = 'user_submission',
    last_reported_at = now(),
    updated_at = now()
  where id = p_target_gym_id;

  update public.gym_update_submissions
  set
    gym_id = p_target_gym_id,
    status = 'approved',
    reviewed_by_user_id = p_reviewed_by_user_id,
    reviewed_at = now(),
    review_notes = p_review_notes,
    changed_fields = coalesce(changed_fields, '{}'::jsonb)
      || jsonb_build_object('equipment', p_inventory_items)
  where id = p_submission_id;
end;
$$;

revoke execute on function public.apply_gym_equipment_inventory_items(
  uuid,
  jsonb
) from public, anon, authenticated;

revoke execute on function public.apply_gym_equipment_import_patch(
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;
grant execute on function public.apply_gym_equipment_import_patch(
  uuid,
  jsonb,
  jsonb
) to service_role;

revoke execute on function public.approve_gym_equipment_submission_patch(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.approve_gym_equipment_submission_patch(
  uuid,
  uuid,
  jsonb,
  uuid,
  text
) to service_role;
