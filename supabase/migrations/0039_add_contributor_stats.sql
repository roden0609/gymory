create table if not exists public.contributor_gym_firsts (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null unique references public.gym_update_submissions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_contributor_gym_firsts_user_id
  on public.contributor_gym_firsts (user_id);

create table if not exists public.contributor_stats (
  user_id uuid primary key references public.users(id) on delete cascade,
  approved_submission_count integer not null default 0,
  first_contributor_count integer not null default 0,
  verified_submission_count integer not null default 0,
  accuracy_vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contributor_stats_approved_submission_count
  on public.contributor_stats (approved_submission_count desc);

create index if not exists idx_contributor_stats_first_contributor_count
  on public.contributor_stats (first_contributor_count desc);

create index if not exists idx_contributor_stats_verified_submission_count
  on public.contributor_stats (verified_submission_count desc);

create index if not exists idx_contributor_stats_accuracy_vote_count
  on public.contributor_stats (accuracy_vote_count desc);

alter table public.contributor_gym_firsts enable row level security;
alter table public.contributor_stats enable row level security;

drop policy if exists "No client read on contributor gym firsts" on public.contributor_gym_firsts;
create policy "No client read on contributor gym firsts"
on public.contributor_gym_firsts
for select
to anon, authenticated
using (false);

drop policy if exists "No client writes on contributor gym firsts" on public.contributor_gym_firsts;
create policy "No client writes on contributor gym firsts"
on public.contributor_gym_firsts
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No client read on contributor stats" on public.contributor_stats;
create policy "No client read on contributor stats"
on public.contributor_stats
for select
to anon, authenticated
using (false);

drop policy if exists "No client writes on contributor stats" on public.contributor_stats;
create policy "No client writes on contributor stats"
on public.contributor_stats
for all
to anon, authenticated
using (false)
with check (false);

insert into public.contributor_gym_firsts (
  gym_id,
  user_id,
  submission_id,
  created_at
)
select distinct on (submission.gym_id)
  submission.gym_id,
  submission.submitted_by_user_id,
  submission.id,
  coalesce(submission.reviewed_at, submission.created_at)
from public.gym_update_submissions submission
where submission.status = 'approved'
  and submission.gym_id is not null
  and submission.submitted_by_user_id is not null
  and submission.submission_type in ('add_gym', 'add_equipment', 'edit_equipment')
order by
  submission.gym_id,
  coalesce(submission.reviewed_at, submission.created_at),
  submission.id
on conflict (gym_id) do nothing;

insert into public.contributor_stats (
  user_id,
  approved_submission_count,
  first_contributor_count,
  verified_submission_count,
  accuracy_vote_count,
  updated_at
)
select
  users.id,
  coalesce(approved_counts.count, 0),
  coalesce(first_counts.count, 0),
  coalesce(verified_counts.count, 0),
  coalesce(accuracy_counts.count, 0),
  now()
from public.users users
left join (
  select submitted_by_user_id as user_id, count(*)::integer
  from public.gym_update_submissions
  where status = 'approved'
    and submitted_by_user_id is not null
  group by submitted_by_user_id
) approved_counts on approved_counts.user_id = users.id
left join (
  select user_id, count(*)::integer
  from public.contributor_gym_firsts
  group by user_id
) first_counts on first_counts.user_id = users.id
left join (
  select submitted_by_user_id as user_id, count(*)::integer
  from public.gym_update_submissions
  where status = 'approved'
    and reviewed_by_user_id is not null
    and submitted_by_user_id is not null
    and submission_type in ('add_gym', 'add_equipment', 'edit_equipment')
  group by submitted_by_user_id
) verified_counts on verified_counts.user_id = users.id
left join (
  select user_id, count(*)::integer
  from public.gym_accuracy_vote_events
  group by user_id
) accuracy_counts on accuracy_counts.user_id = users.id
on conflict (user_id) do update
set
  approved_submission_count = excluded.approved_submission_count,
  first_contributor_count = excluded.first_contributor_count,
  verified_submission_count = excluded.verified_submission_count,
  accuracy_vote_count = excluded.accuracy_vote_count,
  updated_at = excluded.updated_at;
