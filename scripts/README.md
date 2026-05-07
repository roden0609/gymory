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

In short: importers can fill missing DB data and replace changed non-null values,
but they do not erase existing DB values with imported `null`s.

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
