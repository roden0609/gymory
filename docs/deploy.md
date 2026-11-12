# Deployment Workflow

This document defines Gymory's GitHub + Vercel + Supabase integration model.

## Branch Strategy

- `main` -> production deployment
- `develop` -> staging preview deployment
- `feature/*` -> feature preview deployments

## Vercel Environment Mapping

- Production environment variables point to `gymory-prod` Supabase
- Preview environment variables point to `gymory-dev` Supabase
- Development (`.env.local`) should normally point to `gymory-dev`

Required variable groups:

- Public client vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Server-only vars:
  - `SUPABASE_SECRET_KEY`

Never expose server-only vars with `NEXT_PUBLIC_*`.

## GitHub Branch Protection

Configure in GitHub repository settings:

- Protect `main`:
  - Require pull request before merge
  - Require status checks to pass before merge
  - Require branch to be up to date before merge
  - Include administrators
  - Restrict direct pushes
- Protect `develop`:
  - Require pull request before merge
  - Require status checks to pass before merge
  - Restrict direct pushes (recommended for team consistency)

Recommended required status checks:

- `typecheck-lint`

## CI Triggers

CI runs on:

- push to `main`, `develop`, `feature/*`
- pull requests targeting `main` or `develop`
- manual dispatch

CI currently enforces:

- `pnpm typecheck`
- `pnpm lint`

## Database Migration Discipline

Use `supabase/migrations/*` as the single source of truth.

Rules:

- Do not hot-edit production schema manually.
- Add schema changes as new migration files.
- Apply migrations to `gymory-dev` first.
- Promote the same migration sequence to `gymory-prod` after verification.

## Release Flow

1. Create branch from `develop`: `feature/<name>`
2. Open PR to `develop` for staging review
3. Verify preview deployment against `gymory-dev`
4. Merge `develop` -> `main` via PR
5. Confirm production deployment uses `gymory-prod`

## Gym importer environment selection

All eight `import:*` gym listing commands accept `--env-file` together with
`--upsert-file`, `--upsert`, or a source-fetch preview. Run from the repository root:

```bash
pnpm import:247-fitness-hk --env-file apps/web/.env.dev --upsert-file data/gyms/247-fitness-hk-baseline.json
pnpm import:247-fitness-hk --env-file apps/web/.env.prod --upsert-file data/gyms/247-fitness-hk-baseline.json
```

Use `apps/web/.env.local` for local Supabase. Check that the selected file contains
the intended project's URL and secret key before writing. An explicit file must
contain both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`; its values override
shell variables. Missing files, missing credentials and invalid URLs stop the command.
There is no automatic `.env.dev` or `.env.prod` fallback. Without `--env-file`,
commands use the existing process environment, so deployment commands should always
supply the flag. Supabase CLI linking does not select an importer's database.

`--upsert-file` writes immediately; do not add `--upsert`. Source-fetch commands
without `--upsert` only generate JSON files. Keep the same reviewed JSON artifacts
for DEV and PROD. This flag applies to gym listing importers; equipment importers
have their own environment-loading behavior.
