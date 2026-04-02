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

## Getting started

```bash
# Install dependencies
pnpm install

# Copy env file and fill in your keys
cp .env.example apps/web/.env.local

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
