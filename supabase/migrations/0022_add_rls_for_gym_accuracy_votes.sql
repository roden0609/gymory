-- Enable and tighten RLS for gym accuracy voting tables.
-- Voting writes are handled by backend API with service role key only.

alter table public.gym_accuracy_votes enable row level security;
alter table public.gym_accuracy_vote_events enable row level security;

-- Public can read vote totals via PostgREST if needed (active gyms only).
drop policy if exists "Public can read gym accuracy votes for active gyms" on public.gym_accuracy_votes;
create policy "Public can read gym accuracy votes for active gyms"
on public.gym_accuracy_votes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.gyms g
    where g.id = gym_accuracy_votes.gym_id
      and g.is_active = true
  )
);

-- Explicitly deny client-side writes; backend should use service-role through API.
drop policy if exists "No direct client inserts on gym accuracy votes" on public.gym_accuracy_votes;
create policy "No direct client inserts on gym accuracy votes"
on public.gym_accuracy_votes
for insert
to anon, authenticated
with check (false);

drop policy if exists "No direct client updates on gym accuracy votes" on public.gym_accuracy_votes;
create policy "No direct client updates on gym accuracy votes"
on public.gym_accuracy_votes
for update
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct client deletes on gym accuracy votes" on public.gym_accuracy_votes;
create policy "No direct client deletes on gym accuracy votes"
on public.gym_accuracy_votes
for delete
to anon, authenticated
using (false);

-- Keep vote events private: no client read/write.
drop policy if exists "No client read on gym accuracy vote events" on public.gym_accuracy_vote_events;
create policy "No client read on gym accuracy vote events"
on public.gym_accuracy_vote_events
for select
to anon, authenticated
using (false);

drop policy if exists "No client inserts on gym accuracy vote events" on public.gym_accuracy_vote_events;
create policy "No client inserts on gym accuracy vote events"
on public.gym_accuracy_vote_events
for insert
to anon, authenticated
with check (false);

drop policy if exists "No client updates on gym accuracy vote events" on public.gym_accuracy_vote_events;
create policy "No client updates on gym accuracy vote events"
on public.gym_accuracy_vote_events
for update
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No client deletes on gym accuracy vote events" on public.gym_accuracy_vote_events;
create policy "No client deletes on gym accuracy vote events"
on public.gym_accuracy_vote_events
for delete
to anon, authenticated
using (false);
