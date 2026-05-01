create table if not exists public.gym_accuracy_votes (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);

create table if not exists public.gym_accuracy_vote_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  vote text not null check (vote in ('like', 'dislike')),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gym_accuracy_votes_gym_vote
  on public.gym_accuracy_votes (gym_id, vote);

create index if not exists idx_gym_accuracy_vote_events_user_time
  on public.gym_accuracy_vote_events (user_id, created_at desc);

create index if not exists idx_gym_accuracy_vote_events_ip_time
  on public.gym_accuracy_vote_events (ip_hash, created_at desc)
  where ip_hash is not null;

alter table public.gyms
  add column if not exists data_accuracy_status text not null default 'normal'
  check (data_accuracy_status in ('normal', 'needs_review')),
  add column if not exists data_accuracy_flagged_at timestamptz;

create trigger trg_gym_accuracy_votes_updated_at
  before update on public.gym_accuracy_votes
  for each row execute function set_updated_at();
