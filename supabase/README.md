# Supabase database migrations

Run all commands from the **repository root (`gymory/`)**, rather than inside `supabase/`.
SQL files in [`migrations/`](./migrations/) are the source of truth for the database schema.
Promote the same migration through **Local → DEV → PROD**.

## Environments

| Environment | Database / project | CLI target | Web app env file |
| --- | --- | --- | --- |
| Local | Supabase running in Docker | `--local` | `apps/web/.env.local` |
| DEV | `gymory-dev` | `yzvipswjmgcolaepqwoz` | `apps/web/.env.dev` |
| PROD | `gymory-prod` | `qgldameylaysgfsvytjh` | `apps/web/.env.prod` |

The `.env.local`, `.env.dev`, and `.env.prod` files configure the app and importers.
**They do not automatically select the Supabase CLI migration target.**
Use `supabase link --project-ref ...` to select a remote project, and link again whenever
switching between DEV and PROD in the same checkout.
The `--local` flag explicitly targets the local database, even if the checkout is linked to PROD.

## Prerequisites

Install the Supabase CLI. For local development, also start Docker Desktop.
This repository does not include the CLI in its package dependencies; the commands below
use an installed `supabase` executable.

```bash
supabase --version
```

See the [official CLI installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started)
if it is not installed. Before connecting to hosted DEV or PROD for the first time, log in:

```bash
supabase login
```

If linking prompts for a database password, use that project's database password,
rather than its publishable key or secret API key.

## Local: apply pending migrations

```bash
# Start local Supabase. Skip this if it is already running.
supabase start

# Inspect service status and migration history.
supabase status
supabase migration list --local

# Apply all pending migrations while retaining existing data.
supabase migration up --local

# Confirm the latest version appears in both columns.
supabase migration list --local
```

For example, if `0059_add_glute_category.sql` is pending, `migration up --local` applies it.
Any other pending migrations are also applied in version order; the command does not
apply only the latest file. Running it again does not rerun migrations already recorded as applied.

Default local endpoints:

| Service | Address |
| --- | --- |
| API | `http://127.0.0.1:54321` |
| Postgres | `127.0.0.1:54322` |
| Studio | `http://127.0.0.1:54323` |

Use the actual values from `supabase status`. Its output includes local credentials;
do not share it publicly. Configure the local app's `.env.local` with the local API URL
and corresponding keys.

Stop local services when finished:

```bash
supabase stop
```

### Validate local SQL

The [`tests/`](./tests/) directory contains post-migration SQL assertions.
Install the PostgreSQL `psql` client separately to run them.
For example, validate the Glute category after applying `0059`:

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/glute_category.sql
```

This test runs in a transaction and rolls back its test updates at the end.
Read each test's comments and required migration version before running other SQL tests.

### Reset only when you intend to rebuild the local database

```bash
# Deletes existing local data and rebuilds from migrations.
# This is not the normal update command.
supabase db reset --local
```

Use `migration up --local` to retain local gym and equipment data during normal development.
Reset loads only seeds configured for the CLI; placing `seeds/demo_data.sql` in the
directory does not automatically execute it.

## DEV: deploy to gymory-dev

After validating locally, run:

```bash
# Explicitly select the project whenever switching environments.
supabase link --project-ref yzvipswjmgcolaepqwoz

# Compare migration history.
supabase migration list --linked

# Preview pending migrations without writing to the database.
supabase db push --linked --dry-run

# Apply after confirming the pending list matches expectations.
supabase db push --linked

# Confirm the migrations are recorded remotely.
supabase migration list --linked
```

`db push` applies all pending migrations for the selected environment.
Resolve unexpected files or migration history mismatches before proceeding with the push.

Verify the affected features in the DEV app afterward. For example, after `0059`:

- Manage Equipment Types includes the Glute category.
- `hip_thrust_machine` and `hip_abductor_machine` belong to Glute.
- Linked equipment categories are updated, and gym details still display correctly.

Select `.env.dev` explicitly when running app or data validation scripts.
Their environment selection is independent of the CLI's linked project.

## PROD: deploy to gymory-prod

Complete DEV validation, commit or merge the same migration, and confirm a recoverable
PROD backup before deployment. Deploy app versions that require the new schema after
the migration succeeds.

```bash
# Explicitly switch to PROD instead of relying on the previous linked target.
supabase link --project-ref qgldameylaysgfsvytjh

supabase migration list --linked
supabase db push --linked --dry-run

# Apply after reviewing the pending list.
supabase db push --linked

supabase migration list --linked
```

Verify the affected PROD pages and read/write operations afterward.
Select `.env.prod` when running separate validation scripts.
Do not use `db reset --linked` or `db push --include-seed` against PROD.

## Create the next migration

```bash
supabase migration new descriptive_name
```

The CLI creates a timestamped SQL file in `supabase/migrations/`.
Existing files use versions such as `0001`–`0059`; new migrations can keep the
timestamp generated by the CLI without renaming it to four digits.
Edit the SQL, then apply it to Local, DEV, and PROD in that order.

Do not edit a migration already applied to any shared environment.
Create another migration for corrections so migration history stays consistent across environments.
Schema migrations and data imports such as `pnpm import:247-equipment ... --upsert`
are separate operations; applying migrations does not automatically run an importer.

## Troubleshooting

### Migration history is inconsistent

Compare history first:

```bash
supabase migration list --linked
```

Migrations `0001`–`0042` in this repository were originally run manually in the SQL Editor.
If the remote schema contains those changes but their history records are missing,
see the root [README's one-time migration history bootstrap](../README.md#one-time-migration-history-bootstrap).

Use `migration repair` only after confirming the SQL has already been applied.
It changes history records without executing SQL. Do not mark a migration as applied
just to bypass an execution error.

### A pending migration is older than the latest remote version

The CLI may request `--include-all`. First confirm the migration has not already run
and is compatible with the current schema, then preview:

```bash
supabase db push --linked --include-all --dry-run
```

After reviewing the result, apply it:

```bash
supabase db push --linked --include-all
```

This is for applying older pending versions; it is not required for normal migrations.

### A migration fails

Inspect the error, actual schema, and migration history before retrying.
Do not assume the entire batch has rolled back: earlier successful migrations may
already be recorded as applied.
Correct the unapplied SQL or add a corrective migration, then start with a dry run again.
Do not reset DEV or PROD to resolve migration failures.

## Official references

- [CLI reference: migration, link, and db push](https://supabase.com/docs/reference/cli/)
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments)
