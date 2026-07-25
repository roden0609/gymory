-- Preserve submission audit records when a gym is hard-deleted and support the
-- admin history page's common filter and sort paths.

alter table public.gym_update_submissions
  drop constraint if exists gym_update_submissions_gym_id_fkey,
  add constraint gym_update_submissions_gym_id_fkey
    foreign key (gym_id)
    references public.gyms(id)
    on delete set null;

create index if not exists idx_submissions_created_at
  on public.gym_update_submissions (created_at desc);

create index if not exists idx_submissions_status_created_at
  on public.gym_update_submissions (status, created_at desc);

create index if not exists idx_submissions_actor_created_at
  on public.gym_update_submissions (actor_type, created_at desc);

create index if not exists idx_submissions_type_created_at
  on public.gym_update_submissions (submission_type, created_at desc);
