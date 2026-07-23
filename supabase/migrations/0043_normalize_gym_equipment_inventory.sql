-- Normalize generic gym equipment presence and quantity data while retaining the
-- legacy public.gyms columns during the rollback window.

create table if not exists public.equipment_types (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name_en text not null,
  name_zh text,
  category text not null,
  parent_code text references public.equipment_types(code) on delete restrict,
  supports_quantity boolean not null default false,
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  display_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_types_parent_is_different
    check (parent_code is null or parent_code <> code)
);

create table if not exists public.gym_equipment_inventory (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  equipment_code text not null references public.equipment_types(code) on delete restrict,
  is_present boolean,
  quantity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, equipment_code),
  constraint gym_equipment_inventory_quantity_nonnegative
    check (quantity is null or quantity >= 0),
  constraint gym_equipment_inventory_has_value
    check (is_present is not null or quantity is not null),
  constraint gym_equipment_inventory_value_consistency
    check (
      quantity is null
      or (quantity = 0 and is_present is not true)
      or (quantity > 0 and is_present is not false)
    )
);

create index if not exists idx_gym_equipment_inventory_gym_id
  on public.gym_equipment_inventory(gym_id);

create index if not exists idx_gym_equipment_inventory_equipment_gym
  on public.gym_equipment_inventory(equipment_code, gym_id);

create index if not exists idx_gym_equipment_inventory_present
  on public.gym_equipment_inventory(equipment_code, gym_id)
  where is_present is true or quantity > 0;

drop trigger if exists trg_equipment_types_updated_at on public.equipment_types;
create trigger trg_equipment_types_updated_at
  before update on public.equipment_types
  for each row execute function public.set_updated_at();

create or replace function public.prevent_equipment_type_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_code is null then
    return new;
  end if;

  if exists (
    with recursive ancestors as (
      select code, parent_code
      from public.equipment_types
      where code = new.parent_code

      union all

      select parent.code, parent.parent_code
      from public.equipment_types parent
      join ancestors child on parent.code = child.parent_code
    )
    select 1 from ancestors where code = new.code
  ) then
    raise exception 'Equipment type hierarchy cannot contain a cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_equipment_types_prevent_cycle
  on public.equipment_types;
create trigger trg_equipment_types_prevent_cycle
  before insert or update on public.equipment_types
  for each row execute function public.prevent_equipment_type_cycle();

drop trigger if exists trg_gym_equipment_inventory_updated_at
  on public.gym_equipment_inventory;
create trigger trg_gym_equipment_inventory_updated_at
  before update on public.gym_equipment_inventory
  for each row execute function public.set_updated_at();

-- This manifest is the single database-side source for the rollback-window
-- mapping between legacy columns and canonical equipment codes. It is populated
-- from the real gyms schema, with ambiguous aliases resolved explicitly below.
create table if not exists public.equipment_legacy_field_mappings (
  legacy_field text primary key,
  equipment_code text not null references public.equipment_types(code) on delete cascade,
  value_kind text not null check (value_kind in ('presence', 'quantity')),
  is_alias boolean not null default false,
  precedence integer not null default 100,
  created_at timestamptz not null default now()
);

do $$
declare
  equipment_mapping record;
begin
  create temporary table equipment_mapping_seed (
    legacy_field text primary key,
    equipment_code text not null,
    value_kind text not null,
    is_alias boolean not null default false,
    precedence integer not null default 100
  ) on commit drop;

  insert into equipment_mapping_seed (
    legacy_field,
    equipment_code,
    value_kind
  )
  select
    column_name,
    case column_name
      when 'has_battle_ropes' then 'battle_rope'
      when 'has_battle_rope' then 'battle_rope'
      when 'has_farmers_handles' then 'farmer_handles'
      when 'has_farmer_handles' then 'farmer_handles'
      when 'lat_pulldown_count' then 'lat_pulldown_machine'
      when 'chest_press_count' then 'chest_press_machine'
      when 'leg_press_count' then 'leg_press_machine'
      else case
        when column_name like 'has\_%' escape '\'
          then substring(column_name from 5)
        else regexp_replace(column_name, '_count$', '')
      end
    end as equipment_code,
    case
      when column_name like 'has\_%' escape '\' then 'presence'
      else 'quantity'
    end as value_kind
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'gyms'
    and (
      (column_name like 'has\_%' escape '\' and data_type = 'boolean')
      or (
        column_name like '%\_count' escape '\'
        and data_type in ('smallint', 'integer', 'bigint')
      )
    )
    and column_name not in (
      'has_washroom',
      'has_bathroom',
      'has_changing_room',
      'has_free_water',
      'has_dry_sauna',
      'has_wet_sauna',
      'has_ice_bath'
    );

  update equipment_mapping_seed
  set
    is_alias = true,
    precedence = case legacy_field
      when 'has_battle_rope' then 10
      when 'has_farmer_handles' then 10
      when 'has_smith_machine' then 20
      when 'has_chest_press_machine' then 20
      when 'has_leg_press_machine' then 20
      when 'has_lat_pulldown_machine' then 20
      else 30
    end
  where legacy_field in (
    'has_battle_rope',
    'has_battle_ropes',
    'has_farmer_handles',
    'has_farmers_handles',
    'has_smith_machine',
    'has_chest_press_machine',
    'has_leg_press_machine',
    'has_lat_pulldown_machine',
    'lat_pulldown_count',
    'chest_press_count',
    'leg_press_count'
  );

  update equipment_mapping_seed mapping
  set is_alias = true
  where exists (
    select 1
    from equipment_mapping_seed sibling
    where sibling.equipment_code = mapping.equipment_code
      and sibling.legacy_field <> mapping.legacy_field
  );

  for equipment_mapping in
    select
      equipment_code,
      bool_or(value_kind = 'quantity') as supports_quantity,
      array_agg(legacy_field order by precedence, legacy_field) as aliases
    from equipment_mapping_seed
    group by equipment_code
  loop
    insert into public.equipment_types (
      code,
      name_en,
      category,
      supports_quantity,
      aliases
    )
    values (
      equipment_mapping.equipment_code,
      initcap(replace(equipment_mapping.equipment_code, '_', ' ')),
      case
        when equipment_mapping.equipment_code ~ '(treadmill|bike|runner|ski_erg|rower|climber|elliptical)'
          then 'cardio'
        when equipment_mapping.equipment_code ~ '(wall_ball|sandbag|sled|kettlebell)'
          then 'functional'
        when equipment_mapping.equipment_code ~ '(machine|cable|press|curl|raise|squat)'
          then 'strength_machine'
        when equipment_mapping.equipment_code ~ '(rack|bench|barbell|platform|bar|dumbbell|plate)'
          then 'free_weight'
        else 'accessory'
      end,
      equipment_mapping.supports_quantity,
      equipment_mapping.aliases
    )
    on conflict (code) do update
    set
      supports_quantity = excluded.supports_quantity,
      aliases = excluded.aliases,
      updated_at = now();
  end loop;

  insert into public.equipment_legacy_field_mappings (
    legacy_field,
    equipment_code,
    value_kind,
    is_alias,
    precedence
  )
  select
    legacy_field,
    equipment_code,
    value_kind,
    is_alias,
    precedence
  from equipment_mapping_seed
  on conflict (legacy_field) do update
  set
    equipment_code = excluded.equipment_code,
    value_kind = excluded.value_kind,
    is_alias = excluded.is_alias,
    precedence = excluded.precedence;
end
$$;

-- Explicit variant hierarchy. Presence rolls up through these relationships;
-- quantities remain attached to the directly reported type and are never summed.
update public.equipment_types
set parent_code = 'wall_ball'
where code ~ '^wall_ball_[0-9]+kg$'
  or code ~ '^wall_ball_plate_';

update public.equipment_types
set parent_code = 'workout_sandbag'
where code ~ '^sandbag_[0-9]+kg$';

update public.equipment_types
set parent_code = 'kettlebell'
where code ~ '^kettlebell_[0-9]+kg$';

create table if not exists public.gym_equipment_migration_conflicts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  equipment_code text not null references public.equipment_types(code) on delete cascade,
  conflict_type text not null,
  source_values jsonb not null,
  created_at timestamptz not null default now(),
  unique (gym_id, equipment_code, conflict_type)
);

create or replace function public.sync_gym_equipment_inventory_from_row(
  gym_row public.gyms,
  old_gym_row public.gyms default null,
  force_sync boolean default false,
  record_conflicts boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  equipment record;
  field_mapping record;
  new_json jsonb := to_jsonb(gym_row);
  old_json jsonb := case when old_gym_row is null then null else to_jsonb(old_gym_row) end;
  raw_value jsonb;
  source_values jsonb;
  has_changed boolean;
  presence_seen boolean;
  presence_true boolean;
  presence_false boolean;
  quantity_seen boolean;
  resolved_quantity integer;
  resolved_presence boolean;
  conflict_name text;
begin
  for equipment in
    select distinct equipment_code
    from public.equipment_legacy_field_mappings
    order by equipment_code
  loop
    has_changed := force_sync;
    presence_seen := false;
    presence_true := false;
    presence_false := false;
    quantity_seen := false;
    resolved_quantity := null;
    resolved_presence := null;
    source_values := '{}'::jsonb;
    conflict_name := null;

    for field_mapping in
      select legacy_field, value_kind
      from public.equipment_legacy_field_mappings
      where equipment_code = equipment.equipment_code
      order by precedence, legacy_field
    loop
      raw_value := new_json -> field_mapping.legacy_field;

      if old_json is null
        or (old_json -> field_mapping.legacy_field) is distinct from raw_value
      then
        has_changed := true;
      end if;

      if raw_value is not null and raw_value <> 'null'::jsonb then
        source_values := source_values || jsonb_build_object(
          field_mapping.legacy_field,
          raw_value
        );

        if field_mapping.value_kind = 'presence' then
          presence_seen := true;
          if (raw_value #>> '{}')::boolean then
            presence_true := true;
          else
            presence_false := true;
          end if;
        else
          quantity_seen := true;
          resolved_quantity := greatest(
            coalesce(resolved_quantity, 0),
            (raw_value #>> '{}')::integer
          );
        end if;
      end if;
    end loop;

    if not has_changed then
      continue;
    end if;

    if not presence_seen and not quantity_seen then
      delete from public.gym_equipment_inventory
      where gym_id = gym_row.id
        and equipment_code = equipment.equipment_code;
      continue;
    end if;

    if resolved_quantity is not null and resolved_quantity > 0 then
      resolved_presence := true;
      if presence_false then
        conflict_name := 'positive_quantity_with_absence';
      end if;
    elsif resolved_quantity = 0 and presence_true then
      resolved_presence := true;
      resolved_quantity := null;
      conflict_name := 'zero_quantity_with_presence';
    elsif presence_true then
      resolved_presence := true;
      if presence_false then
        conflict_name := 'conflicting_presence_aliases';
      end if;
    elsif presence_false or resolved_quantity = 0 then
      resolved_presence := false;
    end if;

    insert into public.gym_equipment_inventory (
      gym_id,
      equipment_code,
      is_present,
      quantity
    )
    values (
      gym_row.id,
      equipment.equipment_code,
      resolved_presence,
      resolved_quantity
    )
    on conflict (gym_id, equipment_code) do update
    set
      is_present = excluded.is_present,
      quantity = excluded.quantity,
      updated_at = now();

    if record_conflicts and conflict_name is not null then
      insert into public.gym_equipment_migration_conflicts (
        gym_id,
        equipment_code,
        conflict_type,
        source_values
      )
      values (
        gym_row.id,
        equipment.equipment_code,
        conflict_name,
        source_values
      )
      on conflict (gym_id, equipment_code, conflict_type) do update
      set
        source_values = excluded.source_values,
        created_at = now();
    end if;
  end loop;
end;
$$;

create or replace function public.sync_gym_equipment_inventory_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    perform public.sync_gym_equipment_inventory_from_row(
      new,
      old,
      false,
      false
    );
  else
    perform public.sync_gym_equipment_inventory_from_row(
      new,
      null,
      true,
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gyms_sync_equipment_inventory on public.gyms;
drop trigger if exists trg_gyms_sync_equipment_inventory_insert on public.gyms;
drop trigger if exists trg_gyms_sync_equipment_inventory_update on public.gyms;

create trigger trg_gyms_sync_equipment_inventory_insert
  after insert on public.gyms
  for each row execute function public.sync_gym_equipment_inventory_trigger();

do $$
declare
  mapped_columns text;
begin
  select string_agg(format('%I', legacy_field), ', ' order by legacy_field)
  into mapped_columns
  from public.equipment_legacy_field_mappings;

  execute format(
    'create trigger trg_gyms_sync_equipment_inventory_update '
    || 'after update of %s on public.gyms '
    || 'for each row execute function public.sync_gym_equipment_inventory_trigger()',
    mapped_columns
  );
end
$$;

-- Backfill all current gyms. Future inserts and legacy equipment updates are kept
-- in sync atomically by the trigger above.
do $$
declare
  gym_row public.gyms%rowtype;
begin
  for gym_row in select * from public.gyms loop
    perform public.sync_gym_equipment_inventory_from_row(
      gym_row,
      null,
      true,
      true
    );
  end loop;
end
$$;

-- Return whether a gym satisfies all normalized equipment requirements. Parent
-- requirements include present descendants, but quantities are never rolled up.
create or replace function public.gym_matches_equipment_requirements(
  target_gym_id uuid,
  requirements jsonb
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when requirements is null or requirements = '[]'::jsonb then true
    when jsonb_typeof(requirements) <> 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(requirements) requirement
      where not exists (
        with recursive matching_types as (
          select et.code
          from public.equipment_types et
          where et.code = requirement ->> 'equipmentCode'

          union all

          select child.code
          from public.equipment_types child
          join matching_types parent on child.parent_code = parent.code
          where coalesce(
            (requirement ->> 'includeDescendants')::boolean,
            true
          )
        )
        select 1
        from public.gym_equipment_inventory inventory
        where inventory.gym_id = target_gym_id
          and inventory.equipment_code in (select code from matching_types)
          and (
            coalesce((requirement ->> 'minQuantity')::integer, 0) = 0
            and coalesce(inventory.is_present, inventory.quantity > 0) is true
            or inventory.equipment_code = requirement ->> 'equipmentCode'
              and inventory.quantity >= (requirement ->> 'minQuantity')::integer
          )
      )
    )
  end;
$$;

-- Canonical normalized write path. Inventory changes and their approved audit
-- record commit or roll back together.
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
  item jsonb;
  item_code text;
  item_present boolean;
  item_quantity integer;
  audit_id uuid := gen_random_uuid();
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

-- Build a compatibility read model from normalized inventory. This lets the app
-- cut reads over without keeping the legacy gym columns as the source of truth.
do $$
declare
  base_columns text;
  equipment_columns text;
  view_sql text;
begin
  select string_agg(format('g.%I', column_name), ', ' order by ordinal_position)
  into base_columns
  from information_schema.columns column_info
  where table_schema = 'public'
    and table_name = 'gyms'
    and not exists (
      select 1
      from public.equipment_legacy_field_mappings mapping
      where mapping.legacy_field = column_info.column_name
    );

  select string_agg(
    case mapping.value_kind
      when 'presence' then format(
        '(inventory.items -> %L ->> ''effective_present'')::boolean as %I',
        mapping.equipment_code,
        mapping.legacy_field
      )
      else format(
        '(inventory.items -> %L ->> ''quantity'')::integer as %I',
        mapping.equipment_code,
        mapping.legacy_field
      )
    end,
    ', ' order by columns.ordinal_position
  )
  into equipment_columns
  from public.equipment_legacy_field_mappings mapping
  join information_schema.columns columns
    on columns.table_schema = 'public'
    and columns.table_name = 'gyms'
    and columns.column_name = mapping.legacy_field;

  view_sql := format(
    'create or replace view public.gyms_normalized '
    || 'with (security_invoker = true) as '
    || 'select %s, %s '
    || 'from public.gyms g '
    || 'left join lateral ('
    || '  select jsonb_object_agg('
    || '    gei.equipment_code, '
    || '    jsonb_build_object('
    || '      ''effective_present'', coalesce(gei.is_present, gei.quantity > 0), '
    || '      ''quantity'', gei.quantity'
    || '    )'
    || '  ) as items '
    || '  from public.gym_equipment_inventory gei '
    || '  where gei.gym_id = g.id'
    || ') inventory on true',
    base_columns,
    equipment_columns
  );

  execute view_sql;
end
$$;

alter table public.equipment_types enable row level security;
alter table public.gym_equipment_inventory enable row level security;
alter table public.equipment_legacy_field_mappings enable row level security;
alter table public.gym_equipment_migration_conflicts enable row level security;

drop policy if exists "Public can read active equipment types"
  on public.equipment_types;
create policy "Public can read active equipment types"
on public.equipment_types
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read inventory for active gyms"
  on public.gym_equipment_inventory;
create policy "Public can read inventory for active gyms"
on public.gym_equipment_inventory
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.gyms gym
    where gym.id = gym_equipment_inventory.gym_id
      and gym.is_active = true
  )
);

grant select on public.equipment_types to anon, authenticated;
grant select on public.gym_equipment_inventory to anon, authenticated;
grant select on public.gyms_normalized to anon, authenticated;
grant execute on function public.gym_matches_equipment_requirements(uuid, jsonb)
  to anon, authenticated;

revoke execute on function public.apply_gym_equipment_inventory_patch(
  uuid,
  jsonb,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
grant execute on function public.apply_gym_equipment_inventory_patch(
  uuid,
  jsonb,
  uuid,
  uuid,
  jsonb
) to service_role;

revoke all on public.equipment_legacy_field_mappings from anon, authenticated;
revoke all on public.gym_equipment_migration_conflicts from anon, authenticated;
revoke execute on function public.sync_gym_equipment_inventory_from_row(
  public.gyms,
  public.gyms,
  boolean,
  boolean
) from public, anon, authenticated;
