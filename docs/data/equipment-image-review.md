# Equipment image research and admin review

Migration: `supabase/migrations/0063_equipment_image_review.sql`.

## Data ownership

`equipment.name`, `name_zh` and `model_number` retain their existing values. Research is stored separately as `official_name`, `official_model_number`, `official_product_url`, `official_status` and `official_review_note`.

Research statuses: `not_researched`, `ambiguous_model`, `candidate_requires_review`, `model_verified`, `model_verified_image_missing`, `unresolved`. Human approval uses `official_verified_at` and `official_verified_by` (Firebase UID), independently of research confidence and gym inventory verification.

`equipment_images` stores separate rows with `image_role = captured | official`. `official` describes provenance, including unconfirmed candidates; it does not imply approval. Each row keeps its original `url` and optional source-page `source_url`. Both roles may contain the same URL, and each role may have multiple images. Existing images are classified by their existing `source_type`: official sources become official; other sources become captured.

`storage_path` is an object path in the public `equipment-images` bucket, shaped as `<equipment UUID>/<image UUID>/<unique filename>`. The source URL is never replaced. `is_primary` selects the single display image across both roles. Existing remote-only primary rows remain preserved but are not displayed publicly until they have Storage images.

## Import existing research

Apply migration 0063 before deploying the new admin/query code. Existing equipment must already have been imported with its `247-fitness:<inventory_id>` external identity.

```bash
# Preview counts only; no database writes or image downloads.
node scripts/equipments/import-official-equipment-research.mjs

# Explicitly import research and original/candidate image URLs.
node scripts/equipments/import-official-equipment-research.mjs --env-file apps/web/.env.local --upsert
```

The import matches `source_external_id` and the original trimmed model. Missing/ambiguous identities or changed source models fail; it never guesses by name. Each equipment import is atomic; a failed later record does not roll back earlier records. Re-running is safe: image URLs are deduplicated per role, and admin-approved equipment is skipped. Old candidate images are retained for review rather than deleted. No images are downloaded, uploaded or automatically selected by this command.

Legacy research `model_verified_image_unavailable` maps to `model_verified_image_missing`; indexed-only names map to `candidate_requires_review` because the direct source is still unverified.

## Admin workflow

Open `/zh-HK/admin/equipment` (or `/en/admin/equipment`), find an equipment record and click Edit. Below the existing equipment form:

1. Compare captured and official/candidate images, model numbers and source links. Edit/add image URLs or correct official fields as needed.
2. Save research notes and optionally confirm all official data. Uncheck approval and save to withdraw it. The reviewer comes from the authenticated Firebase admin session, never the form.
3. Independently choose a display image. Save the desired original image locally and upload JPEG, PNG or WebP (maximum 5 MB); upload success precedes primary selection. Already-uploaded images can be selected without uploading again.

Official-name/model/status/source changes, source-identity changes or image insertions/deletions/source changes invalidate human approval. Replacing an image URL also clears its previous Storage association and primary flag. Changing display selection or uploading a Storage copy does not approve or disapprove official data. Stale review forms are rejected rather than approving unseen changes.

Uploads use unique filenames and are restricted to authenticated admin server actions; browser clients cannot write to the bucket. Failed database selection after upload attempts to remove the new object. Historical Storage objects are retained when a URL is replaced; object cleanup and bulk source downloads can be added separately.

Public equipment details read only primary images with a Storage path. Captured and manufacturer URLs are not used as public fallbacks. Existing public inventory eligibility remains in force.

## Verification

Run `pnpm test`, `pnpm --filter web typecheck` and `pnpm --filter web lint`. Database behavior checks are in `supabase/tests/equipment_image_review.sql`; run against a disposable database after applying 0063 (the test rolls back its fixtures).
