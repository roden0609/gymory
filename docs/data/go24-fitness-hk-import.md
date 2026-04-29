# GO24 Fitness HK import

This importer builds baseline Gymory rows from GO24 Fitness Hong Kong location pages.

Source pages:

- listing: `https://www.go24fitness.com/en/locations`
- branch detail pattern: `https://www.go24fitness.com/en/look-inside/<slug>`

The site exposes branch names, addresses, and phone numbers. It does not expose
structured equipment inventory, so all equipment-related Gymory columns are
explicitly written as `null`.

## Generate baseline

```bash
pnpm import:go24-fitness-hk
```

Output:

- `data/imports/go24-fitness-hk-baseline.json`

## Save raw detail snapshots

```bash
pnpm import:go24-fitness-hk --details-out data/imports/raw-go24-fitness-hk-details.json
```

This is handy if the site changes and you want to debug parsing without hitting
the live pages again.

## Rebuild from saved detail snapshots

```bash
pnpm import:go24-fitness-hk --details-file data/imports/raw-go24-fitness-hk-details.json
```

## Geocoding

If `MAPBOX_PRIVATE_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` is set, the importer
will try to geocode each branch address and fill `lat` / `lng`.

Skip geocoding explicitly:

```bash
pnpm import:go24-fitness-hk --skip-geocode
```

If Mapbox returns `401` or `403`, the importer will warn once and continue with
`lat` / `lng` left as `null`.

## Upsert into Supabase

```bash
pnpm import:go24-fitness-hk --upsert
```

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

The importer upserts by `slug` and records approved import history in
`gym_update_submissions`.

## District overrides

If a branch district cannot be inferred from the name or address, pass a JSON
map with branch URLs or generated slugs as keys:

```json
{
  "https://www.go24fitness.com/en/look-inside/example": "HK-CW",
  "go24-fitness-example": "HK-CW"
}
```

Then run:

```bash
pnpm import:go24-fitness-hk --district-overrides data/imports/go24-fitness-hk-district-overrides.json
```
