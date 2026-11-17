# Private captured images

Apply migration 0076 to the intended database. It seeds source URLs for existing
24/7 identities from the committed research catalog, in an independent private
table. No official fields, approval state or public images are changed. Missing
equipment identities are not created.

Upload bytes separately (SQL cannot reliably download/upload Storage objects):

```sh
node scripts/equipments/backfill-captured-images.mjs --env-file apps/web/.env.local
node scripts/equipments/backfill-captured-images.mjs --env-file apps/web/.env.local --apply
```

Use an explicit environment file for each target. Dry-run only reads. Apply skips
linked objects, validates source host and image signatures, limits bytes to 20 MB,
uses deterministic object paths, verifies downloaded Storage bytes, then links the
row. Failed items remain pending and can be retried. A source failure never falls
back to an official image. Reports contain IDs and errors, not private URLs.

The bucket has no client access. Only the service role and authenticated Firebase
admin HTTP proxy can read its contents. No signed links are emitted. Original
third-party source URLs remain under that site's access policy; this application
can restrict their disclosure, not revoke access at the source site.
