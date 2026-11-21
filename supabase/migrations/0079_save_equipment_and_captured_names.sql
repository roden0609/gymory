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
      labels=array(select jsonb_array_elements_text(p_machine->'labels')),product_url=p_machine->>'product_url',description=p_machine->>'description',status=p_machine->>'status',source_type=p_machine->>'source_type',import_method='admin',
      captured_name=case when p_machine ? 'captured_name' then nullif(btrim(p_machine->>'captured_name'),'') else captured_name end,
      captured_name_zh=case when p_machine ? 'captured_name_zh' then nullif(btrim(p_machine->>'captured_name_zh'),'') else captured_name_zh end
    where id=target_id and (not (p_machine ? 'expected_updated_at')
      or updated_at = (p_machine->>'expected_updated_at')::timestamptz);
    if not found then raise exception 'Stale or missing equipment'; end if;
  end if;
  perform public.set_equipment_type_assignments(target_id,p_machine->>'primary_type_code',p_additional_codes);
  delete from public.equipment_aliases where equipment_id=target_id;
  insert into public.equipment_aliases(equipment_id,alias) select target_id,alias from (select distinct unnest(p_aliases) alias) aliases;
  return target_id;
end $$;
