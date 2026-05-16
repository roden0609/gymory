create table if not exists public.user_profile_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('profile_updated')),
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_profile_audit_events_user_time
  on public.user_profile_audit_events (user_id, created_at desc);

create index if not exists idx_user_profile_audit_events_actor_time
  on public.user_profile_audit_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.user_profile_audit_events enable row level security;

drop policy if exists "No client read on user profile audit events"
on public.user_profile_audit_events;
create policy "No client read on user profile audit events"
on public.user_profile_audit_events
for select
to anon, authenticated
using (false);

drop policy if exists "No client writes on user profile audit events"
on public.user_profile_audit_events;
create policy "No client writes on user profile audit events"
on public.user_profile_audit_events
for all
to anon, authenticated
using (false)
with check (false);
