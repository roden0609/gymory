# EFX24 HK Listing Baseline

EFX24 Hong Kong branch data is published on their website as branch list pages
and localized branch detail pages:

- List page: `https://efx24.com/find-us/`
- Branch detail pages: `https://efx24.com/find-us/<branch-slug>/`
- Traditional Chinese detail pages: `https://efx24.com/zh-hant/...`

The site exposes branch listing metadata such as branch name, localized address,
phone number, and localized detail URLs. It does not expose structured
equipment inventory, so the importer explicitly writes all Gymory equipment
fields as `null`. That keeps "no upstream data" distinct from a real `0` count
or confirmed `false` boolean.

If `MAPBOX_PRIVATE_TOKEN` or `NEXT_PUBLIC_MAPBOX_TOKEN` is present, the importer
also calls the Mapbox Geocoding API to fill `lat` and `lng`. Because the
results are written to a JSON baseline file and may be upserted into Supabase,
the importer uses Mapbox permanent geocoding. Per Mapbox's documentation, that
requires a valid billing setup for your token.

## Generate Baseline JSON

```bash
pnpm import:efx24-hk
```

This writes:

```text
data/imports/efx24-hk-baseline.json
```

To also capture the parsed branch detail snapshots used to build the baseline:

```bash
pnpm import:efx24-hk --details-out data/imports/raw-efx24-hk-details.json
```

Skip Mapbox geocoding even if a token is available:

```bash
pnpm import:efx24-hk --skip-geocode
```

If you want to re-run baseline generation without hitting the live site, pass
that saved snapshot back in:

```bash
pnpm import:efx24-hk --details-file data/imports/raw-efx24-hk-details.json
```

Rows are mapped to `gyms` listing fields:

| EFX24 branch field | Gymory field |
| --- | --- |
| English page title | `name` |
| Traditional Chinese page title | `name_zh` |
| English address block | `address` |
| Traditional Chinese address block | `address_zh` |
| Branch phone number | `contact_phone` |
| Branch detail URL | `website_url` |
| Mapbox geocoding result | `lat` / `lng` |
| Active detail page | `is_active` |

The generated slug comes from the English branch title, for example:

```text
efx24-aberdeen-port-centre
```

## Upsert Into Supabase

Set these env vars first:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-sb-secret-key
```

Then run:

```bash
pnpm import:efx24-hk --upsert
```

The importer upserts on `slug`. It writes listing metadata plus explicit `null`
equipment fields, and it does not mark any branch as equipment-verified.

`SUPABASE_SECRET_KEY` is preferred for new Supabase API keys. The importer also
accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` as a fallback.

## District Overrides

The importer infers Hong Kong `district_code` from branch name and address.
If a branch cannot be mapped safely, the run fails and prints examples.
Add a small JSON override file keyed by either branch URL or generated slug:

```json
{
  "https://efx24.com/find-us/example-branch/": "HK-YTM",
  "efx24-example-branch": "HK-YTM"
}
```

Then run:

```bash
pnpm import:efx24-hk --district-overrides data/imports/efx24-hk-district-overrides.json
```
