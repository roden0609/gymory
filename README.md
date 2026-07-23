# Gymory

> Find gyms with the equipment you need. Search nearby gyms by racks, machines, and real training gear.

**gymory.io** — Gym equipment discovery platform for serious trainers.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + Tailwind CSS |
| Auth | Firebase Auth (session cookies) |
| Database | Supabase (PostgreSQL) |
| Map | Mapbox |
| Monorepo | pnpm + Turborepo |
| Deploy | Vercel |

## Structure

```
gymory/
├─ apps/web/          # Next.js app (main product)
├─ packages/shared/   # Shared types, zod schemas, constants
├─ supabase/          # DB migrations + seeds
├─ scripts/           # Data import / backfill utilities
├─ docs/              # Product & architecture notes
└─ .github/           # CI workflows
```

## Deployment

See [docs/deploy.md](docs/deploy.md) for:

- branch strategy (`main`/`develop`/`feature/*`)
- Vercel environment mapping to Supabase (`gymory-prod`/`gymory-dev`)
- branch protection and CI requirements
- release flow and migration discipline

## Analytics

Google Analytics 4 is enabled when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.
Use different GA4 measurement IDs per Vercel environment if needed, for example
one production GA4 property and one preview/staging GA4 property.

To exclude your own browser from GA4 tracking on any deployed environment:

```text
https://www.gymory.io/?no_ga=1
```

This sets a `gymory_no_ga=1` cookie and redirects back to the same URL without
the `no_ga` query parameter. While the cookie is present, Gymory does not load
GA4 and client-side `gtag` events are ignored.

To re-enable GA4 tracking for the same browser:

```text
https://www.gymory.io/?no_ga=0
```

Local development only sends GA4 traffic if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is
set locally.

## Getting started

```bash
# Install dependencies
pnpm install

# Copy env file and fill in your keys
cp apps/web/.env.example apps/web/.env.local

# Start local dev
pnpm dev:web
```

## Database setup

Database migrations in `supabase/migrations/` are the source of truth. Apply them
with the Supabase CLI; do not make new schema changes directly in the SQL Editor.

| Environment | Supabase project | Project ref | Validation env |
| --- | --- | --- | --- |
| DEV | `gymory-dev` | `yzvipswjmgcolaepqwoz` | `apps/web/.env.dev` |
| PROD | `gymory-prod` | `qgldameylaysgfsvytjh` | `apps/web/.env.prod` |

### One-time migration history bootstrap

Migrations `0001`–`0042` were originally executed manually in the SQL Editor, so
their SQL may exist in the database without corresponding migration-history
records. Bootstrap each environment once before using `db push`.

Only run `migration repair` after confirming that every migration from `0001`
through `0042` was successfully applied to that database. Repair updates the
migration history only; it does not execute the migration SQL.

DEV:

```bash
supabase link --project-ref yzvipswjmgcolaepqwoz
supabase migration list --linked
supabase migration repair {0001..0042} --status applied --linked
supabase migration list --linked
```

PROD:

```bash
supabase link --project-ref qgldameylaysgfsvytjh
supabase migration list --linked
supabase migration repair {0001..0042} --status applied --linked
supabase migration list --linked
```

After repair, `0001`–`0042` should appear as applied both locally and remotely.
Do not repeat this bootstrap for future migrations.

### Deploy migration `0043`

Always promote the exact same migration file to DEV first, then PROD.

1. Apply and verify on DEV:

   ```bash
   supabase link --project-ref yzvipswjmgcolaepqwoz
   supabase migration list --linked
   supabase db push --linked --dry-run
   supabase db push --linked
   pnpm validate:gym-inventory-normalization -- --env apps/web/.env.dev
   ```

   Before the real push, the dry run must show only
   `0043_normalize_gym_equipment_inventory.sql` as pending. Test the DEV app
   after validation succeeds.

2. Commit or merge the tested migration and application changes.

3. Create or confirm a recoverable PROD database backup in the Supabase
   Dashboard.

4. Apply and verify on PROD:

   ```bash
   supabase link --project-ref qgldameylaysgfsvytjh
   supabase migration list --linked
   supabase db push --linked --dry-run
   supabase db push --linked
   pnpm validate:gym-inventory-normalization -- --env apps/web/.env.prod
   ```

   The PROD dry run must also show only migration `0043`. Because the updated
   app reads the normalized database objects, deploy the PROD database migration
   before deploying the corresponding web application version.

### Normal workflow for future migrations

```bash
# Create and edit a new migration.
supabase migration new descriptive_name

# Promote to DEV.
supabase link --project-ref yzvipswjmgcolaepqwoz
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked

# Test DEV, commit/merge, and back up PROD before promotion.

# Promote the same committed migration to PROD.
supabase link --project-ref qgldameylaysgfsvytjh
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

For each new migration, add an appropriate post-migration validation command or
query and run it in both environments.

Safety rules:

- Always run `migration list` and `db push --dry-run` after switching the linked
  project.
- Stop if a dry run contains an unexpected migration; do not push until the
  history mismatch is understood.
- Never run `supabase db reset --linked` against DEV or PROD.
- Do not use `--include-seed` for PROD.
- Never edit a migration after it has been applied to DEV. Add a new migration
  for corrections.
- Coordinate pushes so only one person changes an environment's migration
  history at a time.

Optional seed:

- Seed demo data from `supabase/seeds/demo_data.sql` when needed.

## Firebase admin role

Use the helper script to set Firebase custom claims for Gymory users.

Grant admin access:

```bash
pnpm firebase:set-claims -- --email your@email.com --role admin
```

Grant user role:

```bash
pnpm firebase:set-claims -- --uid FIREBASE_UID --role user
```

Set the legacy admin flag:

```bash
pnpm firebase:set-claims -- --email your@email.com --admin true
```

After updating claims, sign out and sign in again so the new session picks them up.

## 24/7 Fitness HK import

Generate the latest 24/7 Fitness Hong Kong baseline file:

```bash
pnpm import:247-fitness-hk
```

Use a local detail export when the live API is region-blocked:

```bash
pnpm import:247-fitness-hk --details-file data/imports/raw-247-fitness-hk-details.json
```

Upsert imported rows into Supabase:

```bash
pnpm import:247-fitness-hk --upsert
```

This importer writes `data/imports/247-fitness-hk-baseline.json` and sets unknown equipment fields to `null`.
For full notes, overrides, and API caveats, see `docs/data/247-fitness-hk-import.md`.

## EFX24 HK import

Generate the latest EFX24 Hong Kong baseline file:

```bash
pnpm import:efx24-hk
```

If `MAPBOX_PRIVATE_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` is set, the importer
will also geocode branch addresses and fill `lat` / `lng`.

Save the parsed branch detail snapshot during the run:

```bash
pnpm import:efx24-hk --details-out data/imports/raw-efx24-hk-details.json
```

Rebuild from a saved detail snapshot:

```bash
pnpm import:efx24-hk --details-file data/imports/raw-efx24-hk-details.json
```

Skip geocoding even if a Mapbox token is available:

```bash
pnpm import:efx24-hk --skip-geocode
```

Upsert imported rows into Supabase:

```bash
pnpm import:efx24-hk --upsert
```

This importer writes `data/imports/efx24-hk-baseline.json` and sets unknown equipment fields to `null`.
For full notes and override handling, see `docs/data/efx24-hk-import.md`.

## GO24 Fitness HK import

Generate the latest GO24 Fitness Hong Kong baseline file:

```bash
pnpm import:go24-fitness-hk
```

If `MAPBOX_PRIVATE_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` is set, the importer
will also geocode branch addresses and fill `lat` / `lng`.

Save the parsed branch detail snapshot during the run:

```bash
pnpm import:go24-fitness-hk --details-out data/imports/raw-go24-fitness-hk-details.json
```

Rebuild from a saved detail snapshot:

```bash
pnpm import:go24-fitness-hk --details-file data/imports/raw-go24-fitness-hk-details.json
```

Skip geocoding even if a Mapbox token is available:

```bash
pnpm import:go24-fitness-hk --skip-geocode
```

Upsert imported rows into Supabase:

```bash
pnpm import:go24-fitness-hk --upsert
```

This importer writes `data/imports/go24-fitness-hk-baseline.json` and sets unknown equipment fields to `null`.
For full notes and override handling, see `docs/data/go24-fitness-hk-import.md`.

## LCSD Fitness Rooms HK import

Generate the latest LCSD Fitness Rooms Hong Kong baseline file:

```bash
pnpm import:lcsd-fitness-hk
```

Save the parsed LCSD detail snapshot during the run:

```bash
pnpm import:lcsd-fitness-hk --details-out data/imports/raw-lcsd-fitness-hk-details.json
```

Rebuild from a saved LCSD detail snapshot:

```bash
pnpm import:lcsd-fitness-hk --details-file data/imports/raw-lcsd-fitness-hk-details.json
```

Upsert imported rows into Supabase:

```bash
pnpm import:lcsd-fitness-hk --upsert
```

This importer writes `data/imports/lcsd-fitness-hk-baseline.json` and sets unknown equipment fields to `null`.
