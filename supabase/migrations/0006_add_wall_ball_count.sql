-- Add wall ball support for HYROX / conditioning-focused gyms.

alter table public.gyms
  add column if not exists wall_ball_count integer not null default 0
  check (wall_ball_count >= 0);

create index if not exists idx_gyms_wall_ball_count
  on public.gyms (wall_ball_count);

create index if not exists idx_gyms_sled_count
  on public.gyms (sled_count);
