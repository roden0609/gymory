-- Remove the physical legacy equipment columns after the normalized inventory
-- read/write cutover. Keep the gyms_normalized compatibility view so existing
-- application field names can continue to be derived from normalized inventory.

create temporary table legacy_equipment_columns_0046
on commit drop
as
select
  legacy_field,
  equipment_code,
  value_kind,
  is_alias,
  precedence
from public.equipment_legacy_field_mappings;

do $$
begin
  if not exists (select 1 from legacy_equipment_columns_0046) then
    raise exception
      'Legacy equipment mapping manifest is empty; refusing cleanup';
  end if;

  if to_regclass('public.gyms_normalized') is null then
    raise exception
      'public.gyms_normalized is missing; refusing to remove compatibility columns';
  end if;

  if exists (
    select 1
    from legacy_equipment_columns_0046 legacy
    where not exists (
      select 1
      from information_schema.columns gym_column
      where gym_column.table_schema = 'public'
        and gym_column.table_name = 'gyms'
        and gym_column.column_name = legacy.legacy_field
    )
  ) then
    raise exception
      'public.gyms is already missing one or more mapped legacy equipment columns';
  end if;

  if exists (
    select 1
    from legacy_equipment_columns_0046 legacy
    where not exists (
      select 1
      from information_schema.columns view_column
      where view_column.table_schema = 'public'
        and view_column.table_name = 'gyms_normalized'
        and view_column.column_name = legacy.legacy_field
    )
  ) then
    raise exception
      'public.gyms_normalized does not expose every legacy equipment field';
  end if;

  if exists (
    select 1
    from public.gym_update_submissions submission
    where submission.status = 'pending'
      and jsonb_typeof(submission.payload -> 'equipment') = 'object'
      and exists (
        select 1
        from jsonb_object_keys(submission.payload -> 'equipment') field(field_name)
        join legacy_equipment_columns_0046 legacy
          on legacy.legacy_field = field.field_name
      )
  ) then
    raise exception
      'Pending submissions still contain legacy equipment objects; approve, reject, or convert them before cleanup';
  end if;
end
$$;

-- Keep one private, compact recovery table instead of retaining the live legacy
-- schema. It contains the final flat values, mapping manifest, and classified
-- migration conflicts as JSON snapshots.
create table if not exists public.gym_equipment_legacy_cleanup_backup_0046 (
  source_kind text not null
    check (source_kind in ('gym_values', 'mapping', 'conflict')),
  source_key text not null,
  payload jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (source_kind, source_key)
);

insert into public.gym_equipment_legacy_cleanup_backup_0046 (
  source_kind,
  source_key,
  payload
)
select
  'gym_values',
  gym.id::text,
  jsonb_object_agg(
    legacy.legacy_field,
    to_jsonb(gym) -> legacy.legacy_field
    order by legacy.legacy_field
  )
from public.gyms gym
cross join legacy_equipment_columns_0046 legacy
group by gym.id
on conflict (source_kind, source_key) do nothing;

insert into public.gym_equipment_legacy_cleanup_backup_0046 (
  source_kind,
  source_key,
  payload
)
select
  'mapping',
  mapping.legacy_field,
  to_jsonb(mapping)
from public.equipment_legacy_field_mappings mapping
on conflict (source_kind, source_key) do nothing;

insert into public.gym_equipment_legacy_cleanup_backup_0046 (
  source_kind,
  source_key,
  payload
)
select
  'conflict',
  conflict.id::text,
  to_jsonb(conflict)
from public.gym_equipment_migration_conflicts conflict
on conflict (source_kind, source_key) do nothing;

do $$
begin
  if (
    select count(*)
    from public.gym_equipment_legacy_cleanup_backup_0046
    where source_kind = 'gym_values'
  ) <> (select count(*) from public.gyms) then
    raise exception 'Legacy gym equipment backup row count mismatch';
  end if;

  if (
    select count(*)
    from public.gym_equipment_legacy_cleanup_backup_0046
    where source_kind = 'mapping'
  ) <> (select count(*) from legacy_equipment_columns_0046) then
    raise exception 'Legacy equipment mapping backup row count mismatch';
  end if;

  if (
    select count(*)
    from public.gym_equipment_legacy_cleanup_backup_0046
    where source_kind = 'conflict'
  ) <> (
    select count(*)
    from public.gym_equipment_migration_conflicts
  ) then
    raise exception 'Legacy equipment conflict backup row count mismatch';
  end if;
end
$$;

alter table public.gym_equipment_legacy_cleanup_backup_0046
  enable row level security;
revoke all on public.gym_equipment_legacy_cleanup_backup_0046
  from public, anon, authenticated;

drop trigger if exists trg_gyms_sync_equipment_inventory
  on public.gyms;
drop trigger if exists trg_gyms_sync_equipment_inventory_insert
  on public.gyms;
drop trigger if exists trg_gyms_sync_equipment_inventory_update
  on public.gyms;

drop function if exists public.sync_gym_equipment_inventory_trigger();
drop function if exists public.sync_gym_equipment_inventory_from_row(
  public.gyms,
  public.gyms,
  boolean,
  boolean
);

do $$
declare
  legacy record;
begin
  for legacy in
    select legacy_field
    from legacy_equipment_columns_0046
    order by legacy_field
  loop
    execute format(
      'alter table public.gyms drop column if exists %I',
      legacy.legacy_field
    );
  end loop;
end
$$;

drop table public.gym_equipment_migration_conflicts;
drop table public.equipment_legacy_field_mappings;

comment on table public.gym_equipment_legacy_cleanup_backup_0046 is
  'Recovery snapshot created by migration 0046 before legacy gym equipment columns and migration tables were removed.';
