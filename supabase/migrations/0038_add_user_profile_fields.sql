alter table public.users
  add column if not exists display_name text,
  add column if not exists handle text,
  add column if not exists avatar_url text,
  add column if not exists last_seen_at timestamptz;

update public.users
set display_name = split_part(firebase_email, '@', 1)
where display_name is null
  and firebase_email is not null;

update public.users
set handle = lower(
  trim(
    both '-'
    from regexp_replace(
      coalesce(nullif(display_name, ''), split_part(firebase_email, '@', 1), 'contributor'),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  )
) || '-' || lower(substr(firebase_uid, 1, 6))
where handle is null;

create unique index if not exists idx_users_handle_unique
  on public.users (handle)
  where handle is not null;

create index if not exists idx_users_last_seen_at on public.users (last_seen_at desc);
