# 24/7 Fitness HK Listing Baseline

24/7 Fitness Hong Kong store data is loaded by their frontend from:

- Store list: `https://247.fitness/app-api/cms/store/?lang=zh-hk`
- Store detail: `https://247.fitness/app-api/cms/store/global/detail?lang=zh-hk&countryCode=HK&storeId=<storeId>`
- Required request header: `tenant-id: 1`

The API provides branch listing metadata such as store name, address, phone,
status, latitude, longitude, and images. It does not provide equipment
inventory, so the importer explicitly writes all Gymory equipment fields as
`null`. That keeps "no upstream data" distinct from a real `0` count or
confirmed `false` boolean.

## Generate Baseline JSON

```bash
pnpm import:247-fitness-hk
```

This writes:

```text
data/imports/247-fitness-hk-baseline.json
```

If the live API is region-blocked, export the store detail objects from a
Hong Kong-accessible network and convert that local file instead:

```bash
pnpm import:247-fitness-hk --details-file data/imports/raw-247-fitness-hk-details.json
```

Rows are mapped to `gyms` listing fields:

| 24/7 Fitness field | Gymory field |
| --- | --- |
| `storeName` first `|` segment | `name_zh` |
| `storeName` second `|` segment | `name` |
| `address` first `|` segment | `address_zh` |
| `address` second `|` segment | `address` |
| `mobile` | `contact_phone` |
| `latitude` / `longitude` | `lat` / `lng` |
| `status === 1` | `is_active` |

The generated slug includes the upstream `storeId`, for example:

```text
24-7-fitness-tai-wai-347
```

## Upsert Into Supabase

Set these env vars first:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-sb-secret-key
```

Then run:

```bash
pnpm import:247-fitness-hk --upsert
```

The importer upserts on `slug`. It writes listing metadata plus explicit `null`
equipment fields, and it does not mark any branch as equipment-verified.

Use `SUPABASE_SECRET_KEY` for upsert access.

## District Overrides

The importer infers Hong Kong `district_code` from branch name and address.
If an address cannot be mapped safely, the run fails and prints examples.
Add a small JSON override file keyed by either upstream `storeId` or generated
slug:

```json
{
  "347": "HK-ST",
  "24-7-fitness-example-999": "HK-YTM"
}
```

Then run:

```bash
pnpm import:247-fitness-hk --district-overrides data/imports/247-fitness-hk-district-overrides.json
```

## Known Caveat

The 24/7 Fitness API may return `451` from some regions. In that case, run the
importer from a Hong Kong-accessible network or use a previously exported JSON
file as the review artifact before upserting.
