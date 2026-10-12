-- Run after 0055 with psql -v ON_ERROR_STOP=1 -f this file.
begin;

do $$
declare
  expected_codes text[] := array[
    'assault_runner', 'ski_erg', 'sled', 'rower',
    'kettlebell_16kg', 'kettlebell_24kg', 'kettlebell_32kg',
    'sandbag_10kg', 'sandbag_20kg', 'sandbag_30kg',
    'wall_ball_4kg', 'wall_ball_6kg', 'wall_ball_9kg',
    'wall_ball_plate_9ft', 'wall_ball_plate_10ft'
  ];
begin
  if (select count(*) from public.equipment_types
      where code = any(expected_codes) and 'hyrox' = any(labels)) <> 15
    or exists (select 1 from public.equipment_types
      where 'hyrox' = any(labels) and not (code = any(expected_codes))) then
    raise exception 'HYROX labels must match exactly the fifteen supported types';
  end if;

  begin
    update public.equipment_types set labels = array_append(labels, 'hyrox')
    where code = 'farmer_handles';
    raise exception 'Unsupported HYROX label was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.equipment_types set labels = array_remove(labels, 'hyrox')
    where code = 'assault_runner';
    raise exception 'Required HYROX label was removed';
  exception when check_violation then null;
  end;
end $$;

rollback;
