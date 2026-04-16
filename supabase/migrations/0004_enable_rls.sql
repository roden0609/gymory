-- Enable Row Level Security for tables exposed through Supabase/PostgREST.
-- Public users can read active gym listings and submit pending updates, but
-- cannot directly mutate gyms or read the moderation queue.

alter table public.gyms enable row level security;

create policy "Public can read active gyms"
on public.gyms
for select
to anon, authenticated
using (is_active = true);

alter table public.gym_update_submissions enable row level security;

create policy "Public can create pending submissions"
on public.gym_update_submissions
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_by_user_id is null
  and reviewed_at is null
  and review_notes is null
);
