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
data/gyms/247-fitness-hk-baseline.json
```

If the live API is region-blocked, export the store detail objects from a
Hong Kong-accessible network and convert that local file instead:

```bash
pnpm import:247-fitness-hk --details-file data/gyms/raw-247-fitness-hk-details.json
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
pnpm import:247-fitness-hk --district-overrides data/gyms/247-fitness-hk-district-overrides.json
```

## Known Caveat

The 24/7 Fitness API may return `451` from some regions. In that case, run the
importer from a Hong Kong-accessible network or use a previously exported JSON
file as the review artifact before upserting.

## Import the separate app equipment inventory

The Android app inventory in `data/equipments/247-fitness-hk/` is a separate
source from the listing API above. Prepare its mapping without network access:

```bash
pnpm import:247-equipment
```

This generates `data/equipments/247-fitness-hk-import-plan.json`, joining
`store_id` to the numeric ID at the end of each baseline slug. It contains
159 matched gyms, 833 distinct source inventory IDs, and 6,210 gym/model
links in the current snapshot. Eight empty source inventories produce no
writes or absence claims. The listing baseline itself is unchanged.

Review `equipment` and `review` in the plan before importing. Explicit movement
names map to existing controlled equipment types. Unclear, combined, and
unsupported movements use `other_equipment`; the current snapshot has 319
such entries. These entries need manual classification if more specific types
are desired. Source inventory IDs identify catalog entries, not physical unit
counts; all newly imported quantities remain unknown (`null`). Multiple source
IDs can resolve to one existing database model, so final link counts may differ.

When ready, explicitly select an environment and enable database writes:

```bash
# Development
pnpm import:247-equipment --env-file apps/web/.env.dev --upsert

# Production
pnpm import:247-equipment --env-file apps/web/.env.prod --upsert
```

The env file must define `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
Exported environment variables take precedence over the file. Node 22+ is
required for `process.loadEnvFile`. Without `--upsert` no database is accessed.
The plan is regenerated from source files on each run; editing the generated
plan does not change the importer rules.

All target gyms and required types/categories must already exist. The importer
paginates database reads, reuses brands and unambiguous existing models by
brand plus source ID, normalized name, or model number, and inserts missing
catalog models and inventory relationships. Existing model metadata, quantities,
verification status, and gym listings are preserved. It never deletes inventory.
Writes are incremental rather than one transaction; after resolving a failure,
rerun the same command to continue without duplicating existing relationships.

The database model-inventory trigger derives `gym_equipment_type_inventory`
rows; this importer does not overwrite directly reported type quantities.
New model relationships use `source=import` and `verified_status=unverified`.
They require the normal review/verification process before appearing on public
pages that require owner/admin verification. The app source alone is not
physical verification.

### Verify trusted official imports

To approve the official app inventory for public display during import:

```bash
pnpm import:247-equipment --env-file apps/web/.env.local --upsert --verify
```

`--verify` sets new relationships to `admin_verified` and records `verified_at`,
while retaining `source=import` and source notes. It also promotes existing
`unverified` relationships with `source=import` and this importer's
`24/7 app inventory; 247-fitness:` note prefix. Existing quantities, condition,
notes, and user attribution are preserved. Already verified, community-verified,
manual, and unrelated import relationships are unchanged. Automated verification
does not fabricate an admin user ID. The command reports both newly inserted
relationships and the total number verified in this run.

Without `--verify`, imports retain the original unverified behavior. Without
`--upsert`, even `--verify` only regenerates the local plan and does not access
the database. Verification approves source-reported presence; it does not
confirm physical counts or resolve items in the classification review list.
