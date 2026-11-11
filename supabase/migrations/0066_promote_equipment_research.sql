-- Promotion is atomic per machine and never adopts another environment's UUIDs.
create function public.promote_equipment_research(
  p_id uuid, p_expected_updated_at timestamptz, p_machine jsonb, p_image jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare machine public.equipment; image public.equipment_images;
begin
  select * into strict machine from public.equipment where id=p_id for update;
  if machine.updated_at is distinct from p_expected_updated_at then raise exception 'Stale equipment promotion'; end if;
  if machine.official_verified_at is not null then raise exception 'Admin verified equipment is protected'; end if;
  if machine.source_external_id is distinct from p_machine->>'source_external_id'
    or btrim(coalesce(machine.model_number,'')) <> btrim(coalesce(p_machine->>'model_number','')) then
    raise exception 'Promotion source identity mismatch';
  end if;
  if (nullif(machine.captured_name,'') is not null and machine.captured_name is distinct from p_machine->>'captured_name')
    or (nullif(machine.captured_name_zh,'') is not null and machine.captured_name_zh is distinct from p_machine->>'captured_name_zh') then
    raise exception 'Captured provenance conflict';
  end if;
  update public.equipment set captured_name=p_machine->>'captured_name',captured_name_zh=p_machine->>'captured_name_zh',
    official_name=p_machine->>'official_name',official_name_zh=p_machine->>'official_name_zh',
    official_model_number=p_machine->>'official_model_number',official_product_url=p_machine->>'official_product_url',
    official_status=p_machine->>'official_status',official_review_note=p_machine->>'official_review_note'
    where id=p_id;
  if p_image is not null then
    if not exists(select 1 from storage.objects where bucket_id='equipment-images' and name=p_image->>'storage_path') then
      raise exception 'Storage object not found';
    end if;
    select * into image from public.equipment_images where equipment_id=p_id and image_role='official' and url=p_image->>'url';
    if found then
      if image.id <> (p_image->>'id')::uuid or image.updated_at is distinct from (p_image->>'expected_updated_at')::timestamptz then
        raise exception 'Stale promotion image';
      end if;
      update public.equipment_images set storage_path=p_image->>'storage_path' where id=image.id;
    else
      insert into public.equipment_images(id,equipment_id,image_role,url,source_url,source_type,source_external_key,storage_path)
      values((p_image->>'id')::uuid,p_id,'official',p_image->>'url',p_image->>'source_url','official',machine.source_external_id,p_image->>'storage_path');
    end if;
  end if;
end $$;
revoke all on function public.promote_equipment_research(uuid,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.promote_equipment_research(uuid,timestamptz,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
