begin;

create function public.save_equipment_catalog_machine_and_review(
  p_id uuid, p_machine jsonb, p_additional_codes text[], p_aliases text[],
  p_review jsonb, p_actor text
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  revision timestamptz;
begin
  if p_id is null or p_machine->>'expected_updated_at' is null then
    raise exception 'Equipment ID and revision are required';
  end if;

  perform public.save_equipment_catalog_machine(p_id, p_machine, p_additional_codes, p_aliases);
  select updated_at into strict revision from public.equipment where id = p_id;

  -- The catalog write holds the row lock. The review uses the resulting revision
  -- and any error rolls back the catalog write, assignments and aliases as well.
  perform public.save_equipment_official_review(
    p_id, revision, p_review->>'official_name', p_review->>'official_model_number',
    p_review->>'official_product_url', p_review->>'official_status',
    p_review->>'official_review_note', (p_review->>'verify')::boolean, p_actor,
    p_review->>'official_name_zh'
  );
end $$;

revoke all on function public.save_equipment_catalog_machine_and_review(uuid, jsonb, text[], text[], jsonb, text)
  from public, anon, authenticated;
grant execute on function public.save_equipment_catalog_machine_and_review(uuid, jsonb, text[], text[], jsonb, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
