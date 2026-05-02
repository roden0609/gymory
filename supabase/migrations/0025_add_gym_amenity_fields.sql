alter table public.gyms
  add column if not exists has_washroom boolean,
  add column if not exists has_bathroom boolean,
  add column if not exists has_yoga_block boolean,
  add column if not exists has_yoga_mat boolean;
