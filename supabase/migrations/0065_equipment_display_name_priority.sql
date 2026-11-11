-- Keep stored display names consistent for public reads, search and admin writes.
-- Equipment without captured/official provenance retains its manual display name.
create function public.sync_equipment_display_names() returns trigger
language plpgsql set search_path = public as $$
begin
  new.name := coalesce(nullif(btrim(new.official_name), ''), nullif(btrim(new.captured_name), ''), new.name);
  new.name_zh := coalesce(nullif(btrim(new.official_name_zh), ''), nullif(btrim(new.captured_name_zh), ''), new.name_zh);
  return new;
end $$;

-- Runs before trg_equipment_official_review so effective name changes invalidate
-- approval; captured-only backfills that leave the display unchanged do not.
create trigger trg_equipment_display_names before insert or update on public.equipment
for each row execute function public.sync_equipment_display_names();

update public.equipment set
  name = coalesce(nullif(btrim(official_name), ''), nullif(btrim(captured_name), ''), name),
  name_zh = coalesce(nullif(btrim(official_name_zh), ''), nullif(btrim(captured_name_zh), ''), name_zh)
where name is distinct from coalesce(nullif(btrim(official_name), ''), nullif(btrim(captured_name), ''), name)
   or name_zh is distinct from coalesce(nullif(btrim(official_name_zh), ''), nullif(btrim(captured_name_zh), ''), name_zh);

comment on column public.equipment.name is 'English display name: official_name, then captured_name, then manual name when neither exists.';
comment on column public.equipment.name_zh is 'Chinese display name: official_name_zh, then captured_name_zh, then manual name when neither exists.';
