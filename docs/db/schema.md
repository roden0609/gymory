# Database Schema

This document reflects the current schema implied by `supabase/migrations` through
`0042_create_user_avatars_bucket.sql`.

## Conventions

Gymory currently uses a mostly single-table gym model for searchable gym facts,
plus smaller supporting tables for users, submissions, votes, contributor stats,
and equipment brands.

| Convention | Meaning |
| --- | --- |
| `NULL` equipment values | Unknown / not yet reported |
| `0` count values | Known count is zero |
| `false` boolean values | Known absence |
| `true` boolean values | Known presence |
| `*_count` | Quantity, usually constrained to `>= 0` when known |
| `has_*` | Presence flag |
| `*_kg` | Weight in kilograms |
| `district_code` | Stable Hong Kong district code such as `HK-WC` |
| `country_code` | ISO-style 2-letter country code, default `HK` |

## Extensions and Triggers

- `pgcrypto` is enabled for `gen_random_uuid()`.
- `set_updated_at()` updates `updated_at` before row updates.
- `trg_gyms_updated_at` runs on `gyms`.
- `trg_gym_accuracy_votes_updated_at` runs on `gym_accuracy_votes`.

## `public.gyms`

One row per gym. Public clients can read rows where `is_active = true`; direct
client writes are not exposed through RLS.

### Identity and Location

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `name` | `text` | Required English/default name |
| `name_zh` | `text` | Chinese display name |
| `slug` | `text` | Unique public slug |
| `address` | `text` | English/default address |
| `address_zh` | `text` | Chinese address |
| `district_code` | `text` | Required; HK values constrained to known district codes |
| `country_code` | `text` | Required, default `HK`, must match `^[A-Z]{2}$` |
| `postal_code` | `text` | Optional |
| `lat` | `double precision` | Optional latitude |
| `lng` | `double precision` | Optional longitude |

Valid HK district codes:

```txt
HK-CW, HK-WC, HK-EA, HK-SO, HK-YTM, HK-SSP, HK-KC, HK-WTS, HK-KT,
HK-KTQ, HK-TW, HK-TM, HK-YL, HK-N, HK-TP, HK-ST, HK-SK, HK-IS
```

### Public Contact and Metadata

| Column | Type | Notes |
| --- | --- | --- |
| `website_url` | `text` | Optional official website |
| `instagram_url` | `text` | Optional Instagram URL |
| `contact_phone` | `text` | Optional |
| `size_category` | `text` | `small`, `medium`, or `large` |
| `estimated_size_sqft` | `integer` | Must be `> 0` when present |
| `opening_hours_json` | `jsonb` | Structured opening hours |
| `day_pass_price` | `numeric` | Must be `>= 0` when present |
| `is_active` | `boolean` | Required, default `true` |
| `is_verified` | `boolean` | Required, default `false` |
| `data_source` | `text` | `admin`, `owner`, `user_submission`, or `import` |
| `equipment_notes` | `text` | Free-form notes |
| `equipment_last_verified_at` | `timestamptz` | Optional |
| `last_reported_at` | `timestamptz` | Optional |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

### Data Accuracy

| Column | Type | Notes |
| --- | --- | --- |
| `data_accuracy_status` | `text` | Required, default `normal`; `normal` or `needs_review` |
| `data_accuracy_flagged_at` | `timestamptz` | Set when data needs review |

### Partner Import Fields

| Column | Type | Notes |
| --- | --- | --- |
| `is_hyrox_official` | `boolean` | Required, default `false` |
| `hyrox_partner_id` | `text` | Unique when present |
| `hyrox_source_url` | `text` | Source URL for HYROX import |
| `hyrox_source_synced_at` | `timestamptz` | Last HYROX source sync time |

### Free Weights and Racks

| Column | Type |
| --- | --- |
| `rack_count` | `integer` |
| `bench_count` | `integer` |
| `barbell_count` | `integer` |
| `platform_count` | `integer` |
| `dumbbell_min_weight_kg` | `numeric` |
| `dumbbell_max_weight_kg` | `numeric` |
| `plate_min_weight_kg` | `numeric` |
| `plate_max_weight_kg` | `numeric` |
| `has_smith_machine` | `boolean` |
| `smith_machine_count` | `integer` |
| `has_deadlift_platform` | `boolean` |
| `has_pull_up_bar` | `boolean` |
| `has_dip_station` | `boolean` |
| `has_trx` | `boolean` |
| `has_resistance_band` | `boolean` |
| `has_rings` | `boolean` |
| `has_glute_ham_developer` | `boolean` |
| `has_reverse_hyper` | `boolean` |
| `has_farmers_handles` | `boolean` |
| `has_farmer_handles` | `boolean` |
| `has_roman_chair` | `boolean` |
| `has_trap_bar` | `boolean` |
| `has_safety_squat_bar` | `boolean` |
| `has_landmine_attachment` | `boolean` |
| `has_swiss_bar` | `boolean` |
| `has_cambered_bar` | `boolean` |
| `has_ez_bar` | `boolean` |
| `has_ab_crunch_bench` | `boolean` |
| `has_preacher_curl_bench` | `boolean` |
| `has_overhead_chair` | `boolean` |
| `has_bench_rack` | `boolean` |
| `has_incline_bench_rack` | `boolean` |

### Cardio and Conditioning Counts

| Column | Type |
| --- | --- |
| `treadmill_count` | `integer` |
| `assault_bike_count` | `integer` |
| `exercise_bike_count` | `integer` |
| `climber_count` | `integer` |
| `elliptical_machine_count` | `integer` |
| `assault_runner_count` | `integer` |
| `ski_erg_count` | `integer` |
| `rower_count` | `integer` |
| `sled_count` | `integer` |

### HYROX and Functional Equipment

| Column | Type |
| --- | --- |
| `has_wall_ball` | `boolean` |
| `wall_ball_count` | `integer` |
| `wall_ball_4kg_count` | `integer` |
| `wall_ball_6kg_count` | `integer` |
| `wall_ball_8kg_count` | `integer` |
| `wall_ball_9kg_count` | `integer` |
| `wall_ball_10kg_count` | `integer` |
| `wall_ball_plate_9ft_count` | `integer` |
| `wall_ball_plate_10ft_count` | `integer` |
| `has_workout_sandbag` | `boolean` |
| `has_boxing_sandbag` | `boolean` |
| `sandbag_5kg_count` | `integer` |
| `sandbag_10kg_count` | `integer` |
| `sandbag_15kg_count` | `integer` |
| `sandbag_20kg_count` | `integer` |
| `sandbag_25kg_count` | `integer` |
| `sandbag_30kg_count` | `integer` |
| `has_kettlebell` | `boolean` |
| `kettlebell_4kg_count` | `integer` |
| `kettlebell_6kg_count` | `integer` |
| `kettlebell_8kg_count` | `integer` |
| `kettlebell_10kg_count` | `integer` |
| `kettlebell_12kg_count` | `integer` |
| `kettlebell_14kg_count` | `integer` |
| `kettlebell_16kg_count` | `integer` |
| `kettlebell_18kg_count` | `integer` |
| `kettlebell_20kg_count` | `integer` |
| `kettlebell_24kg_count` | `integer` |
| `kettlebell_32kg_count` | `integer` |
| `has_battle_ropes` | `boolean` |
| `has_battle_rope` | `boolean` |
| `has_plyo_box` | `boolean` |

### Cable and Machine Equipment

| Column | Type |
| --- | --- |
| `cable_machine_count` | `integer` |
| `lat_pulldown_count` | `integer` |
| `chest_press_count` | `integer` |
| `leg_press_count` | `integer` |
| `has_lat_pulldown_cable` | `boolean` |
| `has_seated_row_cable` | `boolean` |
| `has_bicep_curl_machine` | `boolean` |
| `has_tricep_extension_machine` | `boolean` |
| `has_chest_press_machine` | `boolean` |
| `has_incline_chest_press_machine` | `boolean` |
| `has_decline_chest_press_machine` | `boolean` |
| `has_iso_lateral_chest_press_machine` | `boolean` |
| `has_pec_deck_machine` | `boolean` |
| `has_chest_fly_machine` | `boolean` |
| `has_lat_pulldown_machine` | `boolean` |
| `has_seated_row_machine` | `boolean` |
| `has_back_extension_machine` | `boolean` |
| `has_iso_lateral_row_machine` | `boolean` |
| `has_t_bar_row_machine` | `boolean` |
| `has_pull_over_machine` | `boolean` |
| `has_lateral_raise_machine` | `boolean` |
| `has_standing_lateral_raise_machine` | `boolean` |
| `has_reverse_fly_machine` | `boolean` |
| `has_shoulder_press_machine` | `boolean` |
| `has_iso_lateral_shoulder_press_machine` | `boolean` |
| `has_hip_abductor_machine` | `boolean` |
| `has_hip_adductor_machine` | `boolean` |
| `has_leg_extension_machine` | `boolean` |
| `has_leg_press_machine` | `boolean` |
| `has_seated_leg_press_machine` | `boolean` |
| `has_lying_leg_curl_machine` | `boolean` |
| `has_seated_leg_curl_machine` | `boolean` |
| `has_seated_calf_raise_machine` | `boolean` |
| `has_squat_machine` | `boolean` |
| `has_standing_calf_raise_machine` | `boolean` |
| `has_hack_squat` | `boolean` |
| `has_multi_press_machine` | `boolean` |
| `has_multi_hip_machine` | `boolean` |
| `has_stretching_machine` | `boolean` |
| `has_glute_extension_machine` | `boolean` |
| `has_hip_thrust_machine` | `boolean` |
| `has_torso_rotation_machine` | `boolean` |
| `has_ab_crunch_machine` | `boolean` |
| `has_dip_machine` | `boolean` |
| `has_belt_squat_machine` | `boolean` |

### Other Accessories and Amenities

| Column | Type |
| --- | --- |
| `has_foam_roller` | `boolean` |
| `has_medicine_ball` | `boolean` |
| `has_dip_belt` | `boolean` |
| `has_weight_vest` | `boolean` |
| `has_lifting_straps` | `boolean` |
| `has_balance_ball` | `boolean` |
| `has_mobility_stick` | `boolean` |
| `has_exercise_stepper` | `boolean` |
| `has_ab_roller` | `boolean` |
| `has_massage_ball` | `boolean` |
| `has_washroom` | `boolean` |
| `has_bathroom` | `boolean` |
| `has_yoga_block` | `boolean` |
| `has_yoga_mat` | `boolean` |
| `has_dry_sauna` | `boolean` |
| `has_wet_sauna` | `boolean` |
| `has_ice_bath` | `boolean` |
| `has_changing_room` | `boolean` |
| `has_free_water` | `boolean` |

### Removed or Replaced Gym Columns

These appeared in earlier migrations but are not part of the current schema:

- `district` → renamed to `district_code`
- `country` → renamed to `country_code`
- `equipment_tags` → dropped
- `hack_squat_count` → replaced by `has_hack_squat`
- `has_elliptical_machine` → replaced by `elliptical_machine_count`
- `has_sandbag` → renamed to `has_workout_sandbag`
- `ab_crunch_bench_count`, `preacher_curl_bench_count`, `overhead_press_chair_count` → replaced by booleans
- `has_booty_builder` → dropped; Booty Builder is represented as an equipment brand
- `gym_audit` → dropped and folded into submission history

## `public.gym_update_submissions`

User-submitted gym changes pending moderation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `gym_id` | `uuid` | FK to `gyms(id)`, `on delete cascade`, nullable for new gyms |
| `submitted_by_user_id` | `uuid` | FK to `users(id)`, nullable for anonymous submissions |
| `submission_type` | `text` | See allowed values below |
| `status` | `text` | Required, default `pending`; `pending`, `approved`, `rejected` |
| `payload` | `jsonb` | Proposed changes |
| `changed_fields` | `jsonb` | Field-level change summary |
| `action_type` | `text` | Required; `I`, `U`, or `D` |
| `actor_type` | `text` | Required; `user_submission`, `admin`, `owner`, or `import` |
| `reviewed_by_user_id` | `uuid` | FK to `users(id)`, nullable |
| `reviewed_at` | `timestamptz` | Nullable |
| `review_notes` | `text` | Nullable |
| `created_at` | `timestamptz` | Required, default `now()` |

Allowed `submission_type` values:

```txt
add_gym, edit_gym_info, add_equipment, edit_equipment, remove_equipment,
upload_photo, delete_gym
```

RLS allows public clients to insert pending submissions only when review fields
are empty.

## `public.users`

Application user profile table keyed to Firebase identity.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `firebase_login_type` | `text` | Currently `google` |
| `firebase_uid` | `text` | Required, unique |
| `firebase_email` | `text` | Required |
| `role` | `text` | Required, default `basic`; `admin` or `basic` |
| `display_name` | `text` | Public display name |
| `handle` | `text` | Public handle, unique when present |
| `avatar_url` | `text` | Public avatar URL |
| `last_seen_at` | `timestamptz` | Last activity timestamp |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

RLS is enabled. The migrations do not define public read/write policies for this
table.

## Equipment Brand Tables

### `public.equipment_brands`

Dictionary of equipment brands.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `slug` | `text` | Required, unique |
| `name_en` | `text` | Required |
| `name_zh` | `text` | Optional |
| `country` | `text` | Optional |
| `is_active` | `boolean` | Required, default `true` |
| `aliases` | `text[]` | Required, default `{}` |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

Public clients can read active brands.

Seeded brands include Technogym, Life Fitness, Precor, Matrix Fitness, Hammer
Strength, Rogue Fitness, Eleiko, Concept2, SportsArt, Newtech Wellness, XMaster
Fitness, Booty Builder, and others.

### `public.gym_brand_inventory`

Many-to-many join between gyms and equipment brands.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `gym_id` | `uuid` | Required FK to `gyms(id)`, `on delete cascade` |
| `brand_id` | `uuid` | Required FK to `equipment_brands(id)`, `on delete cascade` |
| `equipment_types` | `text[]` | Required, default `{}` |
| `confidence` | `text` | Required, default `reported`; `reported` or `confirmed` |
| `source_submission_id` | `uuid` | FK to `gym_update_submissions(id)`, nullable |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

Constraint: unique `(gym_id, brand_id)`.

Public clients can read inventory rows for active gyms.

## Accuracy Voting Tables

### `public.gym_accuracy_votes`

Current vote per user per gym.

| Column | Type | Notes |
| --- | --- | --- |
| `gym_id` | `uuid` | PK part, FK to `gyms(id)` |
| `user_id` | `uuid` | PK part, FK to `users(id)` |
| `vote` | `text` | `like` or `dislike` |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

Public clients can read votes for active gyms. Client writes are denied; backend
APIs should write with the service role.

### `public.gym_accuracy_vote_events`

Private append-only vote event log.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `gym_id` | `uuid` | Required FK to `gyms(id)` |
| `user_id` | `uuid` | Required FK to `users(id)` |
| `vote` | `text` | `like` or `dislike` |
| `ip_hash` | `text` | Optional |
| `user_agent` | `text` | Optional |
| `created_at` | `timestamptz` | Required, default `now()` |

RLS denies client reads and writes.

## Contributor Tables

### `public.contributor_gym_firsts`

Tracks the first contributor for each gym.

| Column | Type | Notes |
| --- | --- | --- |
| `gym_id` | `uuid` | Primary key, FK to `gyms(id)` |
| `user_id` | `uuid` | Required FK to `users(id)` |
| `submission_id` | `uuid` | Required unique FK to `gym_update_submissions(id)` |
| `created_at` | `timestamptz` | Required, default `now()` |

RLS denies client reads and writes.

### `public.contributor_stats`

Cached contributor counters.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key, FK to `users(id)` |
| `approved_submission_count` | `integer` | Required, default `0` |
| `first_contributor_count` | `integer` | Required, default `0` |
| `verified_submission_count` | `integer` | Required, default `0` |
| `accuracy_vote_count` | `integer` | Required, default `0` |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

RLS denies client reads and writes.

## `public.user_profile_audit_events`

Private profile update audit log.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `user_id` | `uuid` | Required FK to `users(id)` |
| `actor_user_id` | `uuid` | FK to `users(id)`, nullable |
| `event_type` | `text` | Required; currently `profile_updated` |
| `old_values` | `jsonb` | Required, default `{}` |
| `new_values` | `jsonb` | Required, default `{}` |
| `ip_hash` | `text` | Optional |
| `user_agent` | `text` | Optional |
| `created_at` | `timestamptz` | Required, default `now()` |

RLS denies client reads and writes.

## Storage

### `user-avatars`

Supabase Storage bucket for user avatar uploads.

| Setting | Value |
| --- | --- |
| Bucket ID / name | `user-avatars` |
| Public | `true` |
| File size limit | `2097152` bytes |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |

## Key Indexes

The migrations add indexes for common lookups:

- `gyms`: district, active status, lat/lng, slug, rack/count/weight filters,
  HYROX fields, and selected equipment counts.
- `gym_update_submissions`: status, gym, submitter, reviewer.
- `equipment_brands`: unique slug.
- `gym_brand_inventory`: gym and brand lookup, unique `(gym_id, brand_id)`.
- `gym_accuracy_votes`: `(gym_id, vote)`.
- `gym_accuracy_vote_events`: user/time and IP/time.
- `users`: unique handle when present, last-seen ordering.
- `contributor_stats`: descending leader-board counters.
- `user_profile_audit_events`: user/time and actor/time.

## Search Query Pattern

Example equipment search:

```sql
select *
from public.gyms
where is_active = true
  and district_code = 'HK-WC'
  and coalesce(rack_count, 0) >= 2
  and coalesce(ski_erg_count, 0) >= 1
  and coalesce(dumbbell_max_weight_kg, 0) >= 40
order by is_verified desc, updated_at desc;
```

Use `NULL` carefully: in Gymory, `NULL` usually means unknown, not zero.
