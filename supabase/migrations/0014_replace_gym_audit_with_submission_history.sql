drop table if exists public.gym_audit;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  firebase_login_type text check (firebase_login_type in ('google')),
  firebase_uid text not null unique,
  firebase_email text not null,
  role text not null default 'basic' check (role in ('admin', 'basic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

alter table public.gym_update_submissions
  add column if not exists changed_fields jsonb,
  add column if not exists action_type text,
  add column if not exists actor_type text;

update public.gym_update_submissions
set
  action_type = coalesce(
    action_type,
    case
      when submission_type = 'add_gym' then 'I'
      when submission_type = 'delete_gym' then 'D'
      else 'U'
    end
  ),
  actor_type = coalesce(actor_type, 'user_submission');

alter table public.gym_update_submissions
  alter column action_type set not null,
  alter column actor_type set not null;

alter table public.gym_update_submissions
  drop constraint if exists gym_update_submissions_action_type_check,
  add constraint gym_update_submissions_action_type_check
    check (action_type in ('I', 'U', 'D')),
  drop constraint if exists gym_update_submissions_actor_type_check,
  add constraint gym_update_submissions_actor_type_check
    check (actor_type in ('user_submission', 'admin', 'owner', 'import'));

alter table public.gym_update_submissions
  drop constraint if exists gym_update_submissions_submission_type_check,
  add constraint gym_update_submissions_submission_type_check
    check (
      submission_type in (
        'add_gym',
        'edit_gym_info',
        'add_equipment',
        'edit_equipment',
        'remove_equipment',
        'upload_photo',
        'delete_gym'
      )
    );

alter table public.gym_update_submissions
  drop constraint if exists gym_update_submissions_submitted_by_user_id_fkey,
  add constraint gym_update_submissions_submitted_by_user_id_fkey
    foreign key (submitted_by_user_id) references public.users(id) on delete set null,
  drop constraint if exists gym_update_submissions_reviewed_by_user_id_fkey,
  add constraint gym_update_submissions_reviewed_by_user_id_fkey
    foreign key (reviewed_by_user_id) references public.users(id) on delete set null;

create index if not exists idx_submissions_submitted_by on public.gym_update_submissions (submitted_by_user_id);
create index if not exists idx_submissions_reviewed_by on public.gym_update_submissions (reviewed_by_user_id);
