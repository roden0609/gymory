# Promote official equipment research

This workflow promotes the 24/7 research data and locally stored images to an
existing DEV or PROD equipment catalog. It does not clone the database or create
missing brands/equipment/inventory. Missing or duplicate identities, brand/model
mismatches and differing captured names are reported as conflicts. Resolve those
before treating a promotion as complete.

## Prepare a portable bundle once

Run from the repository root with local Supabase running:

```bash
mkdir -p .cache/equipment-promotions
node scripts/equipments/promote-official-equipment.mjs export \
  --env-file apps/web/.env.local \
  --bundle .cache/equipment-promotions/official-2026-11-11-retry6
```

Export is read-only against local Supabase. The new directory must not already
exist. It contains `manifest.json` and content-addressed WebP files downloaded
from local Storage, never manufacturer sites. Each file is checked against its
SHA-256 before promotion. Copy the **entire directory** to durable backup/release
storage; `.cache` is ignored by Git. Neither env files nor credentials are bundled.
The updated 2026-11-11 bundle has 833 equipment records, 833 stored image references
and no pending images. The latest Chrome browser recovery downloaded and verified
all 172 remaining image references after direct HTTP retries returned 403/444.
See `docs/data/247-fitness-hk-browser-image-recovery-2026-11-11-sixth.json`.
Shared image bytes are deduplicated, so file count can differ.
Pending URLs stay in the manifest/report; this workflow updates their equipment
metadata but does not manufacture replacement images or new image rows for them.

## Apply schema first

Back up the target DB and any existing Storage assets using your normal backup
process. Follow [the Supabase deployment guide](../../supabase/README.md) to inspect
and apply pending migrations **through 0066**, first in DEV and then in PROD.
Migration 0065 maintains official → captured display-name priority. Migration
0066 provides an atomic, service-role-only promotion RPC.

CLI linking and script env files are independent. The script reads credentials
only from the named env file and checks the URL against the explicit target:

| Target | Expected URL |
| --- | --- |
| `local` | `http://127.0.0.1:54321` |
| `dev` | `https://yzvipswjmgcolaepqwoz.supabase.co` |
| `prod` | `https://qgldameylaysgfsvytjh.supabase.co` |

## DEV: dry-run, review, apply

Every attempt needs a new report directory. Dry-run performs no target writes.

```bash
node scripts/equipments/promote-official-equipment.mjs promote \
  --target dev --env-file apps/web/.env.dev \
  --bundle .cache/equipment-promotions/official-2026-11-11-retry6 \
  --report-dir .cache/equipment-promotions/dev-preview-1

# Review report.json, then apply with a new report directory.
node scripts/equipments/promote-official-equipment.mjs promote \
  --target dev --env-file apps/web/.env.dev \
  --bundle .cache/equipment-promotions/official-2026-11-11-retry6 \
  --report-dir .cache/equipment-promotions/dev-apply-1 --apply
```

The script backs up target equipment/images/brands to `before.json` before any
write. These snapshots are restoration inputs, not an automatic rollback tool.
Keep reports private; they include catalog review notes. Existing admin-approved
equipment is always `skipped_verified`, even when source data matches. Skips need
review before claiming all 833 records have been promoted.

Equipment is matched by `source_external_id` and checked against brand slug and
captured model number. Matching image rows use equipment ID + role + original
URL. Target UUIDs are used in Storage paths; local UUIDs are never copied.
Existing images keep source details, sort order and primary selection. New official
images are not set primary. Public pages can use their uploaded official fallback.

Files upload first, then the RPC locks and checks the target revision before
atomically updating metadata/image paths. Admin approval/provenance is rechecked
inside the transaction. Concurrent changes fail that record instead of overwriting
it. Partial success across records is possible. A failed transaction can leave an
unreferenced uploaded file; its path is retained in the report. No files are deleted
automatically. Upload paths for new rows are deterministic, so retrying can reuse them.

On apply, records are verified by fresh DB reads and SHA-256 checks of public
Storage downloads. `verified` and `unchanged` mean successful verification.
`failed` or `conflict` gives a nonzero exit status; fix and rerun with a new report
directory. Completed records are safe to rerun. Dry-run lists old/new metadata,
display names and target image paths; conflicts also give a nonzero exit status.
Inspect skipped approvals and pending images regardless of exit status.

Verify the DEV public equipment cards, localized names, admin image previews,
uploads and primary selection. Deploy the matching app changes after schema
migrations. The 172 missing images remain a separate follow-up.

## PROD

After DEV validation, use the **same bundle**, apply the same schema migrations,
then repeat the two commands above with `--target prod`,
`--env-file apps/web/.env.prod`, and fresh `prod-preview-1` / `prod-apply-1`
report directories. Verify PROD and retain its backup/report with the release.
Do not use database reset, seed replacement or a full local DB restore for this
targeted promotion. Copying DB rows alone does not transfer Storage file contents.

## Local verification

`--target local --env-file apps/web/.env.local` supports rehearsal against local
Supabase. As with remote apply, `--apply` writes data and may add content-addressed
Storage objects; dry-run is the default. Run the unit suite with `pnpm test`.
The rollback-only DB assertions are in
`supabase/tests/equipment_research_promotion.sql` and require migration 0066.
