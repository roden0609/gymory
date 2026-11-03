# 24/7 source identity repair — 2026-11-03

Target: local Supabase (`127.0.0.1`). Development and production were not modified.

The previous importer could reuse equipment based on matching display names or
model numbers. Different source inventory IDs therefore lost their independent
identity, and some gym relationships pointed to the wrong model. Its ASCII-only
name comparator could also consider unrelated Chinese names equal.

The importer now resolves equipment strictly by brand and source external ID.
Names and model numbers never substitute for source identity. Newly created model
numbers have surrounding whitespace trimmed; manually maintained equipment is
not claimed or overwritten.

## Local database changes

- Created the 75 missing source equipment records, each with its own primary type.
- Added 437 missing source gym/equipment relationships.
- Corrected 360 legacy importer-owned relationships: verified exact original
  `24/7 app inventory; 247-fitness:<ID>. Presence only; quantity unknown.` notes,
  required unchanged null quantity/condition and no manual author/reviewer,
  copied the existing verification metadata onto the correct new relationship,
  and removed the old wrong relationship in one transaction. Both old and new
  rows were compared against pre-repair snapshots before any corrections.
- The remaining 77 newly added relationships stayed unverified; they were not
  automatically approved.
- Imported all 833 research records and 1,545 image URL records: 833 captured and
  712 official/candidate. Existing source equipment names/models were preserved.
- No image downloads or Storage uploads were performed.

## Verification

All 833 source inventory IDs have exactly one independent database record and
match their original model. All 6,210 source gym/equipment relationships exist.
Official research fields and image URLs match the catalog underlying the current
Markdown and Excel reports. The 360 replacement relationships retain their prior
verification metadata; all unrelated inventory rows, existing equipment source
fields, brands, gyms, images and type assignments were compared with the backup
and preserved.

Local totals after repair: 841 equipment records (including 8 existing non-source
records) and 6,219 gym/equipment relationships (including 9 existing non-source
relationships). Admin image review now includes IDs that previously lacked their
own equipment record, including inventory ID 130.

Pre-repair snapshot: `/tmp/gymory-247-repair-before.json`. Guarded link repair plan
and SQL: `/tmp/gymory-247-link-repair-plan.json` and
`/tmp/gymory-247-link-repair.sql`. These local temporary audit files are not a
replacement for a persistent database backup.

Regression coverage checks distinct source IDs with identical names/models,
different Chinese names, preservation of manual records, trimmed model numbers
and repeated-import idempotence.
