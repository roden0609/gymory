-- equipment_tags has been replaced by explicit single-table equipment columns.

drop index if exists idx_gyms_equipment_tags;

alter table public.gyms
  drop column if exists equipment_tags;
