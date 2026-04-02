-- gym_update_submissions: user-submitted changes, pending admin review
-- Allows no-login submissions (submitted_by_user_id is nullable for anon)

create table if not exists gym_update_submissions (
  id uuid primary key default gen_random_uuid(),

  gym_id     uuid references gyms(id) on delete cascade,
  submitted_by_user_id uuid, -- nullable for anonymous submissions

  submission_type text not null check (submission_type in (
    'add_gym',
    'edit_gym_info',
    'add_equipment',
    'edit_equipment',
    'remove_equipment',
    'upload_photo'
  )),

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  -- Free-form JSON blob of proposed changes
  payload jsonb not null,

  -- Review fields (filled in by admin)
  reviewed_by_user_id uuid,
  reviewed_at         timestamptz,
  review_notes        text,

  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_status on gym_update_submissions (status);
create index if not exists idx_submissions_gym_id on gym_update_submissions (gym_id);
