-- Type writes are available only to the trusted backend admin workflow.
grant insert, update, delete on public.equipment_types to service_role;

-- Equipment stores a derived category_id; keep it consistent when an admin
-- changes its type's category. Run in the same transaction as the type update.
create function public.sync_equipment_category_after_type_update()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.equipment
  set category_id = (
    select id from public.equipment_categories
    where slug = replace(new.category, '_', '-')
  )
  where equipment_type_code = new.code;
  return new;
end;
$$;

create trigger trg_equipment_type_category_sync
  after update of category on public.equipment_types
  for each row when (old.category is distinct from new.category)
  execute function public.sync_equipment_category_after_type_update();

-- The existing equipment.equipment_type_code ON DELETE RESTRICT foreign key
-- blocks deletion while any equipment references the type, including races.
