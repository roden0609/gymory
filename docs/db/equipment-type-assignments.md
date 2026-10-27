# Equipment type assignments

Migration 0060 makes `equipment_type_assignments` the canonical classification
relation. Each machine has exactly one primary assignment and any number of
additional capabilities. The composite primary key prevents duplicate types per
machine; a partial unique index prevents multiple primaries. A deferred constraint
rejects removal of the last primary. Assignment edits lock the machine row to
serialize concurrent changes.

Migration 0061 removes `equipment.equipment_type_code` and `category_id`.
Assignments are now the only stored machine classification. Display/grouping uses
the primary assignment's type and its `equipment_types.category`; category filters
match all primary and additional assignments. No category value is duplicated on
an equipment row, so changing a type's category takes effect without synchronizing
machines. A deferred constraint on new equipment also prevents committing a model
without its primary assignment.

All assignments share source and verification metadata. The migrated primaries
start with source `legacy`; this does not invent a new verification event. Public
capability visibility continues to depend on a public, verified gym inventory
record and active machine, brand, type and category. Assignment metadata records
classification provenance; it does not replace the inventory publication policy.

Backend-only RPCs:

- `create_247_equipment_model`: atomically creates an imported machine and its
  primary/additional assignments. Direct REST INSERT followed by separate assignment
  writes is invalid because every machine needs a primary at commit.
- `save_equipment_catalog_machine`: atomically saves a machine, its full primary /
  additional assignment set, and aliases. Admin edits mark the assignments as
  administrator-owned, preventing the importer from replacing those choices.
- `set_equipment_type_assignments`: atomically replaces the assignment set for an
  existing machine. It validates active type codes and rejects a primary repeated
  as an additional type.
- `apply_247_equipment_classification`: locks and verifies importer identity and
  ownership, reclassifies only an importer-owned Other primary, then synchronizes
  the reviewed additional capabilities in the same transaction. It does not
  override administrator-owned classifications or a different non-Other primary.
- `sync_247_equipment_type_assignments`: the supporting guarded capability sync;
  it deletes only obsolete assignments owned by this importer and retains manual
  additional capabilities. Repeated imports do not duplicate capabilities.

Public machine inventory queries return one model with all its active types.
Grouping lists the model under each matching capability, deduplicated by machine
ID within a type. Physical quantity stays on `gym_equipment_inventory`; it is not
summed across capabilities or written into generic type counts. Derived generic
presence rows and equipment requirement searches include additional types. Catalog
category filters and admin type filters likewise match every assignment.

Apply locally with `supabase migration up --local`, then run the 24/7 importer with
`--upsert` to fill its reviewed capabilities. Applying the migration backfills
existing primary assignments only; it does not guess extra functions for other
models. Remote deployments must apply migrations through 0061 together with this
application/importer release. Older clients that still read or write the removed
columns cannot run after the cutover. The admin RPC payload uses `primary_type_code`;
that field is input for an assignment, not a column on equipment.

Validation: `supabase/tests/equipment_classification_cutover.sql` exercises the current schema,
including column absence, deferred primary checks, derived categories and RLS,
atomic admin/importer creation and update rollback. The migration-0060 fixture
`supabase/tests/equipment_type_assignments.sql` targets the pre-cutover schema and exercises constraints,
search visibility, ownership, idempotency, transactional rollback and cleanup. All
fixtures roll back. Application/importer unit tests also cover multi-capability
reads, grouping, category filters, validation and RPC payloads.
