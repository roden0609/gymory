alter table gyms
  add column if not exists is_hyrox_official boolean not null default false,
  add column if not exists hyrox_partner_id text,
  add column if not exists hyrox_source_url text,
  add column if not exists hyrox_source_synced_at timestamptz;

create index if not exists idx_gyms_hyrox_official
  on gyms (is_hyrox_official)
  where is_active = true and is_hyrox_official = true;

create unique index if not exists idx_gyms_hyrox_partner_id
  on gyms (hyrox_partner_id)
  where hyrox_partner_id is not null;
