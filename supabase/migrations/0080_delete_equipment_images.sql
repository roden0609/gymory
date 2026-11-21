create function public.delete_equipment_image(
  p_id uuid, p_image_id uuid, p_expected_updated_at timestamptz,
  p_private boolean, p_image_updated_at timestamptz,
  p_expected_display_id uuid, p_expected_next_display_id uuid
) returns text language plpgsql security invoker set search_path = public as $$
declare
  current_revision timestamptz;
  image_revision timestamptz;
  removed_path text;
  current_display_id uuid;
  next_display_id uuid;
begin
  select updated_at into current_revision from public.equipment where id = p_id for update;
  if not found or current_revision is distinct from p_expected_updated_at then
    raise exception 'Stale equipment image review';
  end if;

  if p_private then
    delete from public.equipment_captured_images
      where id = p_image_id and equipment_id = p_id returning storage_path into removed_path;
    if not found then raise exception 'Stale equipment image'; end if;
  else
    select updated_at into image_revision from public.equipment_images
      where id = p_image_id and equipment_id = p_id for update;
    if not found or image_revision is distinct from p_image_updated_at then
      raise exception 'Stale equipment image';
    end if;

    select id into current_display_id from public.equipment_images
      where equipment_id = p_id and nullif(storage_path, '') is not null and (is_primary or image_role = 'official')
      order by is_primary desc, sort_order, id limit 1;
    select id into next_display_id from public.equipment_images
      where equipment_id = p_id and id <> p_image_id
        and nullif(storage_path, '') is not null and (is_primary or image_role = 'official')
      order by is_primary desc, sort_order, id limit 1;
    if current_display_id is distinct from p_expected_display_id
      or next_display_id is distinct from p_expected_next_display_id then
      raise exception 'Stale equipment image selection';
    end if;

    -- The existing image-delete trigger withdraws official approval.
    delete from public.equipment_images where id = p_image_id returning storage_path into removed_path;
    if exists(select 1 from public.equipment_images where storage_path = removed_path) then
      return null;
    end if;
  end if;

  -- Only hand the Storage API objects owned by the deleted row. Old or shared
  -- paths outside that namespace require a separate orphan audit.
  if starts_with(removed_path, p_id::text || '/' || p_image_id::text || '/') then
    return removed_path;
  end if;
  return null;
end $$;

revoke all on function public.delete_equipment_image(uuid,uuid,timestamptz,boolean,timestamptz,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.delete_equipment_image(uuid,uuid,timestamptz,boolean,timestamptz,uuid,uuid)
  to service_role;
notify pgrst, 'reload schema';
