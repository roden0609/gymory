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

1. Create a Supabase project at https://supabase.com
2. Run migrations in order via the Supabase SQL Editor:
   - `supabase/migrations/0001_create_gyms.sql`
   - `supabase/migrations/0002_add_indexes.sql`
   - `supabase/migrations/0003_create_submissions.sql`
3. (Optional) seed demo data: `supabase/seeds/demo_data.sql`

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
