-- HYROX type labels are defined by the supported race-training equipment list.
-- Preserve any other labels already assigned to a type.
update public.equipment_types
set labels = array_remove(labels, 'hyrox') ||
  case when code in (
    'assault_runner', 'ski_erg', 'sled', 'rower',
    'kettlebell_16kg', 'kettlebell_24kg', 'kettlebell_32kg',
    'sandbag_10kg', 'sandbag_20kg', 'sandbag_30kg',
    'wall_ball_4kg', 'wall_ball_6kg', 'wall_ball_9kg',
    'wall_ball_plate_9ft', 'wall_ball_plate_10ft'
  ) then array['hyrox'] else '{}'::text[] end;

alter table public.equipment_types
  add constraint equipment_types_hyrox_label_matches_code check (
    ('hyrox' = any(labels)) = (code in (
      'assault_runner', 'ski_erg', 'sled', 'rower',
      'kettlebell_16kg', 'kettlebell_24kg', 'kettlebell_32kg',
      'sandbag_10kg', 'sandbag_20kg', 'sandbag_30kg',
      'wall_ball_4kg', 'wall_ball_6kg', 'wall_ball_9kg',
      'wall_ball_plate_9ft', 'wall_ball_plate_10ft'
    ))
  );
