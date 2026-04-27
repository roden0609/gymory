create table if not exists public.gym_audit (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete set null,
  action_type text not null check (action_type in ('I', 'U', 'D')),
  actor_type text not null check (actor_type in ('user_submission', 'admin', 'owner', 'import')),
  firebase_login_type text check (firebase_login_type in ('google')),
  firebase_uid text,
  firebase_email text,
  changed_fields jsonb,
  gym_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gym_audit_gym_id on public.gym_audit (gym_id);
create index if not exists idx_gym_audit_created_at on public.gym_audit (created_at desc);
create index if not exists idx_gym_audit_actor_type on public.gym_audit (actor_type);

alter table public.gym_audit enable row level security;
