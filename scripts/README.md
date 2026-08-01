# Scripts

## Gym import upsert behavior

All `scripts/import-*.mjs` importers write to Supabase only when they are run with
`--upsert`. They all call the shared helper:

```js
scripts/lib/upsert-gyms-with-submissions.mjs
```

Existing gyms are matched by `slug`. If no existing gym is found, the importer
inserts a new row into `gyms` and writes an approved `add_gym` submission.

If an existing gym is found, the importer builds the update payload using import
mode rules.

### Null and overwrite rules

For each field in the imported row:

| New import value | Existing DB value | Result |
| --- | --- | --- |
| `null` | has value | Does not update that field. The key is removed from the PATCH payload. |
| has value | `null` | Updates DB to the imported value. |
| has value | has value | Updates DB only if the value is different. |
| `null` | `null` | No meaningful change for that field. |
| shorter `address`/`address_zh` contained in the existing address | more detailed address | Preserves the existing address to prevent source-page truncation from degrading DB data. |

In short: importers can fill missing DB data and replace changed non-null values,
but they do not erase existing DB values with imported `null`s.
They also preserve a more detailed existing address when the imported address is
only a shortened subset. A genuinely different non-null address can still update
the DB.

### Change detection

After the import payload is prepared, changed fields are detected by comparing
the existing DB value with the next import value using `JSON.stringify`.

These fields are ignored for change detection:

- `data_source`
- `created_at`
- `updated_at`
- `last_reported_at`

If no changed fields remain, the helper skips the row. It does not PATCH `gyms`
and does not create a `gym_update_submissions` record.

If at least one field changed, the helper:

1. PATCHes the existing `gyms` row.
2. Inserts an approved `edit_gym_info` record into `gym_update_submissions`.
3. Stores `changed_fields` with only the fields that changed.

Separately, the helper treats non-amenity `has_*` and `*_count` input keys as
equipment compatibility fields. It converts them to canonical equipment codes
in-process, removes them from the `gyms` write, and applies changed values
through the normalized inventory import RPC. Known aliases use explicit code
overrides; unknown codes are rejected by the database RPC.

Importers preserve omitted or `null` equipment values as no change. Explicit
presence, absence, zero, and positive quantities are written to
`gym_equipment_inventory` and logged as approved `edit_equipment` import
submissions. Importers do not depend on the removed
`equipment_legacy_field_mappings` table.

## Import overrides

Override files are optional and are loaded only when their corresponding CLI
flag is supplied. A dry run and an `--upsert` run apply the same overrides.

### District overrides

Importers that support `--district-overrides` accept a JSON object that maps a
source identifier or generated slug to a Gymory district code:

```json
{
  "pure-fitness-kinwick-centre-kin": "HK-CW"
}
```

Example:

```bash
node scripts/import-pure-fitness-hk.mjs \
  --district-overrides path/to/district-overrides.json
```

For the PURE Fitness importer, keys may be the English club URL, source
`branch_code`, or generated slug. They are checked in that order before the
importer attempts to infer the district from the club name and address. Values
must use the `HK-*` district-code format. The import fails if any resulting gym
still has no district.

### Chinese address overrides

The PURE Fitness importer supports `--address-overrides` because a Traditional
Chinese club page may publish its address in English. The JSON object maps a
source `branch_code`, English club URL, or generated slug to an `address_zh`
value:

```json
{
  "pure-fitness-kinwick-centre-kin": {
    "address_zh": "中環蘇豪荷李活道32號建業榮基中心3樓"
  }
}
```

Example using the committed override file:

```bash
node scripts/import-pure-fitness-hk.mjs \
  --address-overrides data/imports/pure-fitness-hk-address-overrides.json
```

PURE address keys are checked in `branch_code`, English club URL, then slug
order. An override must contain only a non-empty `address_zh` string. Without
the flag, the importer retains the address parsed from the PURE source page.

Both flags can be used together:

```bash
node scripts/import-pure-fitness-hk.mjs \
  --district-overrides path/to/district-overrides.json \
  --address-overrides data/imports/pure-fitness-hk-address-overrides.json
```

## Chrome modes

If EFX24 or GO24 returns a CAPTCHA to Node `fetch()`, the importer fails before
writing an empty baseline. Use explicit headed browser mode to render the
source with the locally installed Google Chrome:

```bash
pnpm import:efx24-hk --browser
pnpm import:go24-fitness-hk --browser
```

Browser mode uses an isolated persistent profile under `.cache/`: EFX24 uses
`efx24-chrome-profile` and GO24 uses `go24-chrome-profile`. Complete browser
verification manually if the opened window requests it. Importers do not
automatically enable browser mode and do not use the personal default Chrome
profile. A custom dedicated profile can be supplied with
`--browser-profile <path>`.
