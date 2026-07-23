# Functional Requirements: Gym Inventory Normalization

## Status

Implemented through the additive schema, backfill, normalized read, transitional
write, and canonical admin write phases. General form/importer write cutover and
legacy column removal remain intentionally pending until production reconciliation
and observation exit criteria pass.

Implementation entry points:

- `supabase/migrations/0043_normalize_gym_equipment_inventory.sql`
- `apps/web/src/lib/db/queries/gym-equipment-inventory.ts`
- `apps/web/src/app/api/gyms/[id]/equipment/route.ts`
- `scripts/validate-gym-inventory-normalization.mjs`

This document defines the target product and data requirements for moving generic
gym equipment presence and quantity data out of the wide `public.gyms` table and
into a normalized equipment catalog and gym inventory model.

---

## Overview

Gymory currently stores generic equipment facts as individual columns on
`public.gyms`. Examples include:

- `rack_count`
- `barbell_count`
- `wall_ball_4kg_count`
- `has_trap_bar`
- `has_chest_press_machine`

This model made the original MVP simple, but it now requires a database migration,
shared type change, search query change, form change, and importer change whenever
a new equipment type is introduced. The table also contains legacy aliases and
cases where the same equipment is represented by both a presence flag and a
quantity.

The normalized model has two layers:

1. **Equipment Types** — the canonical list of generic equipment concepts, such as
   `barbell`, `platform`, `wall_ball`, and `wall_ball_4kg`.
2. **Gym Equipment Inventory** — the known presence or quantity of an equipment
   type at a particular gym.

The change must preserve Gymory's existing three-state data semantics:

- unknown or not reported
- confirmed present
- confirmed absent

It must also preserve existing search, gym detail, training collection, equipment
landing page, submission, and importer behavior throughout the rollout.

---

## Goals

- Remove generic equipment `has_*` and `*_count` fields from `public.gyms` after a
  safe transition period.
- Allow a new generic equipment type to be added without altering `public.gyms`.
- Maintain one canonical equipment code for each equipment concept.
- Preserve the difference between unknown, present, absent, and known quantity.
- Support equipment variants and parent-child relationships, such as
  `wall_ball` and `wall_ball_4kg`.
- Support efficient filtering by one or more equipment requirements with correct
  pagination and total counts.
- Preserve auditability of equipment changes through the existing submission
  workflow.
- Migrate production data without an immediate destructive schema change.

---

## Non-Goals

- Do not normalize gym amenities as part of this project.
- Do not redesign the public search or gym detail UI.
- Do not build the brand/model-level machine catalog described in
  `docs/product/gym-equipment-fr.md` as part of this project.
- Do not require an exact quantity for every known equipment item.
- Do not treat a missing inventory row as confirmed absence.
- Do not drop legacy `public.gyms` columns in the same release that introduces the
  new tables.
- Do not infer that an equipment type exists solely because a brand is associated
  with the gym.

---

## Terminology

| Term | Meaning |
| --- | --- |
| Equipment type | A generic equipment concept, such as `rack`, `ski_erg`, or `wall_ball_6kg` |
| Equipment model | A brand-specific product, such as a particular Hammer Strength machine |
| Inventory row | A gym-to-equipment record containing presence and/or quantity |
| Parent equipment | A broad type that may contain variants, such as `wall_ball` |
| Equipment variant | A more specific child type, such as `wall_ball_4kg` |
| Unknown | Gymory has no usable evidence about presence or quantity |
| Confirmed absent | Gymory has explicit evidence that the gym does not have the equipment |

---

## Scope Decisions

### Equipment included in this normalization

The migration includes generic equipment fields currently stored as:

- equipment-related `has_*` columns
- equipment-related `*_count` columns
- legacy aliases of those columns

Examples include racks, benches, barbells, platforms, cardio machines, HYROX
equipment, free-weight accessories, cable equipment, and strength machines.

### Amenities excluded from this normalization

The following fields are amenities and must not be inserted into the equipment
catalog or gym equipment inventory:

- `has_washroom`
- `has_bathroom`
- `has_changing_room`
- `has_free_water`
- `has_dry_sauna`
- `has_wet_sauna`
- `has_ice_bath`

They remain on `public.gyms` until a separate amenity normalization project is
approved.

### Other gym equipment metadata

The following fields remain on `public.gyms` in this project:

- `dumbbell_min_weight_kg`
- `dumbbell_max_weight_kg`
- `plate_min_weight_kg`
- `plate_max_weight_kg`
- `equipment_notes`
- `equipment_last_verified_at`

They do not fit the presence/quantity inventory shape cleanly. A future project may
introduce typed equipment attributes or per-item verification metadata.

---

## FR-1: Canonical Equipment Type Catalog

### FR-1.1 Equipment type records

The system must provide a canonical catalog table named
`public.equipment_types`.

Recommended schema:

| Column | Type | Requirement |
| --- | --- | --- |
| `code` | `text` | Primary key; stable machine-readable identifier |
| `name_en` | `text` | Required English/default display name |
| `name_zh` | `text` | Optional Chinese display name |
| `category` | `text` | Required category used for grouping and display |
| `parent_code` | `text` | Optional self-reference to `equipment_types.code` |
| `supports_quantity` | `boolean` | Required; whether an exact quantity is meaningful |
| `aliases` | `text[]` | Optional search/import aliases |
| `is_active` | `boolean` | Required, default `true` |
| `display_order` | `integer` | Optional stable ordering within a category |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

### FR-1.2 Stable code format

Equipment codes must:

- use lower-case snake case
- begin with a lower-case letter
- contain only lower-case letters, numbers, and underscores
- remain stable after publication
- describe the equipment concept rather than UI copy

Recommended database constraint:

```sql
check (code ~ '^[a-z][a-z0-9_]*$')
```

Examples:

```text
rack
barbell
platform
wall_ball
wall_ball_4kg
wall_ball_6kg
chest_press_machine
```

Display-name changes must not require an equipment code change.

### FR-1.3 Catalog validation

- `parent_code` must not equal `code`.
- A parent must not create a circular hierarchy.
- Inactive equipment types remain readable for historical inventory but must not
  appear as selectable options for new submissions or admin edits.
- Deleting a type referenced by inventory is not allowed. Types must be marked
  inactive instead.

### FR-1.4 Generic types versus brand-specific models

`equipment_types` represents generic concepts. It does not replace a future
brand/model catalog.

Example:

- generic type: `leg_press_machine`
- brand/model: `Hammer Strength Iso-Lateral Leg Press`

A future brand/model inventory record may reference an `equipment_types.code`, but
the two concepts must not be merged in this project.

---

## FR-2: Gym Equipment Inventory

### FR-2.1 Inventory table

The system must provide a table named
`public.gym_equipment_inventory`.

Required schema:

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `gym_id` | `uuid` | Required foreign key to `public.gyms(id)` with `on delete cascade` |
| `equipment_code` | `text` | Required foreign key to `public.equipment_types(code)` |
| `is_present` | `boolean` | Nullable explicit presence or absence |
| `quantity` | `integer` | Nullable known quantity |
| `created_at` | `timestamptz` | Required, default `now()` |
| `updated_at` | `timestamptz` | Required, default `now()` |

There must be no more than one row for the same gym and equipment code:

```sql
unique (gym_id, equipment_code)
```

### FR-2.2 Inventory value semantics

The following semantics are required:

| Inventory state | Meaning |
| --- | --- |
| No row | Unknown or not reported |
| `is_present = true`, `quantity = null` | Confirmed present; quantity unknown |
| `is_present = true`, `quantity > 0` | Confirmed present with known quantity |
| `is_present = false`, `quantity = null` | Confirmed absent |
| `is_present = false`, `quantity = 0` | Confirmed absent with known zero quantity |
| `is_present = null`, `quantity > 0` | Quantity proves presence; accepted during migration/import |
| `is_present = null`, `quantity = 0` | Known zero quantity; treated as absent |
| `is_present = null`, `quantity = null` | Invalid; no information should not create a row |

Application reads must resolve effective presence as:

```sql
coalesce(is_present, quantity > 0)
```

Absence of a row must resolve to unknown, not `false`.

### FR-2.3 Consistency constraints

The database must enforce:

- `quantity` is `NULL` or greater than or equal to zero.
- `is_present = false` cannot be combined with `quantity > 0`.
- `is_present = true` cannot be combined with `quantity = 0`.
- `is_present` and `quantity` cannot both be `NULL`.

Recommended checks:

```sql
check (quantity is null or quantity >= 0),
check (is_present is not null or quantity is not null),
check (
  quantity is null
  or (quantity = 0 and is_present is not true)
  or (quantity > 0 and is_present is not false)
)
```

### FR-2.4 Write normalization

New application writes should store a canonical `is_present` value whenever the
quantity is known:

- positive quantity writes `is_present = true`
- zero quantity writes `is_present = false`

Nullable `is_present` with a known quantity remains accepted so imports and the
legacy migration do not lose information.

### FR-2.5 Required indexes

At minimum, create:

```sql
create index on public.gym_equipment_inventory (gym_id);
create index on public.gym_equipment_inventory (equipment_code, gym_id);
```

Additional partial or covering indexes may be added after measuring real search
queries. Indexes must be validated with representative multi-filter searches
before legacy columns are dropped.

### FR-2.6 Timestamp behavior

`updated_at` must be refreshed whenever an inventory row changes, using the
project's existing `set_updated_at()` trigger convention or equivalent behavior.

---

## FR-3: Equipment Hierarchy and Roll-Up

### FR-3.1 Parent-child relationships

The catalog must support equipment variants through `parent_code`.

Example:

```text
wall_ball
├── wall_ball_4kg
├── wall_ball_6kg
├── wall_ball_8kg
├── wall_ball_9kg
└── wall_ball_10kg
```

Similar structures may be used for kettlebells and sandbags.

### FR-3.2 Presence roll-up

A positive child inventory row proves that the parent equipment is present for
search and display-summary purposes.

For example, a gym with `wall_ball_6kg` quantity `4` must match a search for
`wall_ball` even when there is no direct `wall_ball` inventory row.

### FR-3.3 Quantity roll-up

Parent and child quantities must not be summed automatically. Existing source data
may report an overall parent count and specific child counts that overlap.

The UI may display:

- the direct parent quantity when explicitly reported
- individual child quantities when explicitly reported

It must not calculate a total unless the data source guarantees that the values
are disjoint.

### FR-3.4 Conflicting parent and child evidence

Migration and write logic must not create or retain an explicit absent parent when
a child is known present.

When evidence conflicts:

1. positive quantity wins over an absence flag
2. explicit presence wins over explicit absence when both came from legacy alias
   columns in the same gym row
3. the conflict must be included in a migration validation report

---

## FR-4: Legacy Field Mapping

### FR-4.1 Exhaustive mapping manifest

Before backfill, implementation must define one reviewed mapping manifest covering
every equipment-related `has_*` and `*_count` column on `public.gyms`.

Each mapping entry must contain:

- legacy column name
- canonical equipment code
- source value type: `presence` or `quantity`
- whether it is a legacy alias
- optional parent equipment code
- migration precedence rule when multiple fields map to the same code

The backfill, compatibility adapter, importer conversion, and validation tooling
should consume the same manifest where practical. The mappings must not be copied
independently into several unconnected implementations.

### FR-4.2 Canonical alias handling

Known legacy duplicates must map to one canonical code. Examples include:

| Legacy fields | Canonical code |
| --- | --- |
| `has_battle_rope`, `has_battle_ropes` | `battle_rope` |
| `has_farmer_handles`, `has_farmers_handles` | `farmer_handles` |
| `has_smith_machine`, `smith_machine_count` | `smith_machine` |
| `has_wall_ball`, `wall_ball_count` | `wall_ball` |
| `has_chest_press_machine`, `chest_press_count` | `chest_press_machine` |
| `has_leg_press_machine`, `leg_press_count` | `leg_press_machine` |
| `has_lat_pulldown_machine`, `lat_pulldown_count` | `lat_pulldown_machine` |

The implementation must review these mappings against actual production data
before backfill. Similar names must not be merged automatically when they may
represent distinct concepts. For example, `platform` and `deadlift_platform`
remain separate unless product review explicitly approves a merge.

### FR-4.3 Boolean-only fields

For a nullable legacy `has_*` field:

- `true` creates or merges an inventory row with `is_present = true`
- `false` creates or merges an inventory row with `is_present = false`
- `NULL` creates no inventory row unless another mapped field supplies information

### FR-4.4 Quantity-only fields

For a nullable legacy `*_count` field:

- value greater than zero creates or merges a row with `quantity = value` and
  effective presence `true`
- value equal to zero creates or merges a row with `quantity = 0` and effective
  presence `false`
- `NULL` creates no inventory row unless another mapped field supplies information

### FR-4.5 Combined presence and quantity fields

When presence and quantity fields map to the same canonical code:

- a positive quantity must produce `is_present = true`
- a zero quantity with a `true` presence flag must preserve confirmed presence and
  set `quantity = NULL`; the conflict must be reported
- a positive quantity with a `false` presence flag must produce
  `is_present = true`; the conflict must be reported
- compatible values should be merged into one row

### FR-4.6 Idempotent backfill

The backfill must be safe to run more than once. Re-running it must not create
duplicate rows or overwrite newer normalized data without an explicit conflict
policy.

---

## FR-5: Read APIs and Application Types

### FR-5.1 Normalized application shape

The target shared application type must represent gym equipment as a collection,
not as one property per equipment code.

Recommended shape:

```ts
type GymEquipmentInventoryItem = {
  id: string;
  gym_id: string;
  equipment_code: string;
  is_present: boolean | null;
  quantity: number | null;
  equipment_type?: EquipmentType;
  created_at: string;
  updated_at: string;
};
```

A gym detail read should be able to return the gym and its inventory without one
request per equipment item.

### FR-5.2 Transitional compatibility

During migration, the application may use a compatibility adapter or database view
that exposes legacy flat properties to unchanged UI components.

The compatibility layer must:

- be generated from or aligned with the canonical mapping manifest
- preserve `NULL`, `false`, `true`, zero, and positive quantity semantics
- be temporary and have a documented removal phase
- not become the permanent write interface

### FR-5.3 No N+1 reads

Gym detail, search results, maps, training pages, and equipment landing pages must
not issue one inventory query per gym. Reads must use embedded relations, batched
queries, a view, or an RPC.

---

## FR-6: Search and Filtering

### FR-6.1 Database-side filtering

Equipment filtering must happen in PostgreSQL before pagination. The app must not
fetch a page of gyms and remove non-matching gyms in application code.

The query result must provide:

- matching gyms
- stable ordering
- requested page and page size
- exact or explicitly documented total count behavior

### FR-6.2 Search RPC

The recommended implementation is a versioned PostgreSQL search function, such as
`search_gyms_v2`, that accepts ordinary gym filters and structured equipment
requirements.

An equipment requirement must support at least:

```ts
type EquipmentRequirement = {
  equipmentCode: string;
  isPresent?: true;
  minQuantity?: number;
  includeDescendants?: boolean;
};
```

Example requirements:

```json
[
  { "equipmentCode": "rack", "minQuantity": 2 },
  { "equipmentCode": "trap_bar", "isPresent": true },
  { "equipmentCode": "ski_erg", "isPresent": true }
]
```

This example must match only gyms satisfying all three requirements.

### FR-6.3 Multi-filter intersection

Multiple equipment requirements use `AND` semantics unless the product filter
explicitly requests an alternative group.

The SQL implementation may use correlated `exists`, joins with aliases, or
`group by ... having`, but it must be covered by integration tests for:

- one presence filter
- one minimum-quantity filter
- multiple presence filters
- mixed presence and quantity filters
- parent equipment with matching child inventory
- filters combined with district, gym chain, brand, location, and training
  collection criteria

### FR-6.4 Existing routes and SEO pages

The following behaviors must continue to work after read cutover:

- the main search page and API
- district pages
- map and split search views
- equipment landing pages
- training collection pages
- indexable equipment and training page discovery

URL query parameters do not need to change as part of the normalization.

### FR-6.5 Search performance

Before legacy columns are dropped, representative production-like searches must be
measured with `EXPLAIN (ANALYZE, BUFFERS)` or equivalent tooling.

The normalized search should not introduce unbounded application-side ID lists or
queries whose cost grows with every inventory row regardless of selected filters.

---

## FR-7: Submissions and Admin Review

### FR-7.1 Submission payload

The target equipment submission payload must use canonical equipment codes and
inventory values rather than legacy column names.

Recommended shape:

```json
{
  "equipment": [
    {
      "equipmentCode": "rack",
      "isPresent": true,
      "quantity": 4
    },
    {
      "equipmentCode": "trap_bar",
      "isPresent": true,
      "quantity": null
    }
  ]
}
```

### FR-7.2 Partial updates

A submission must distinguish between:

- equipment not mentioned in the submission
- equipment explicitly changed to present
- equipment explicitly changed to absent
- equipment whose quantity is changed or cleared

Omitting an equipment code must not delete or mark its inventory row absent.

### FR-7.3 Approval transaction

Approving an equipment submission must update the relevant inventory rows and
write the existing submission/audit record as one atomic database operation.

If atomicity cannot be guaranteed by the current application calls, the
implementation must introduce a database function or equivalent transaction
boundary.

### FR-7.4 Historical payloads

Existing submission records containing legacy flat equipment fields remain valid
historical records and must not be destructively rewritten.

During the transition, review tooling must either:

- understand both legacy and normalized payload versions, or
- convert legacy pending submissions through the canonical mapping manifest before
  approval

New payloads should include an explicit schema version.

---

## FR-8: Importers and Data Sources

### FR-8.1 Canonical importer output

All gym import scripts must ultimately write canonical inventory rows using
equipment codes.

Importer-specific copies of the equipment taxonomy should be avoided. Importers
may map source vocabulary to canonical codes, but canonical validation must be
shared.

### FR-8.2 Upsert behavior

Importer writes must upsert on `(gym_id, equipment_code)` and must not create
duplicates.

An importer that lacks equipment information must not delete existing inventory or
write confirmed absence unless its source explicitly confirms absence.

### FR-8.3 Transitional writes

While production readers still depend on legacy columns, equipment writes must
either:

- dual-write normalized inventory and legacy columns within an atomic operation,
  or
- run during a controlled write freeze followed by immediate read cutover

Best-effort dual writes from separate application calls are not acceptable because
they can leave the two models inconsistent.

### FR-8.4 Source conflict policy

This project does not introduce per-item source precedence. Existing admin and
submission review rules remain authoritative.

If automated imports can overwrite human-reviewed inventory, implementation must
define and approve a source precedence policy before enabling those writes.

---

## FR-9: Authorization and RLS

### FR-9.1 Equipment catalog reads

Anonymous and authenticated public clients may read active equipment types.
Inactive types may remain readable only where required to display existing public
inventory.

### FR-9.2 Inventory reads

Anonymous and authenticated public clients may read inventory only when the
related gym is active.

### FR-9.3 Inventory writes

Public clients must not directly insert, update, or delete inventory rows.
Equipment changes must continue through approved server-side, importer, admin, or
submission workflows.

### FR-9.4 Catalog writes

Only trusted admin/service-role workflows may create or update equipment types.

---

## FR-10: Migration and Rollout

### Phase 0: Inventory and mapping review

- Freeze the list of legacy fields covered by the migration.
- Create the exhaustive mapping manifest.
- Identify aliases, parent-child relationships, and ambiguous mappings.
- Measure null, zero, positive, true, false, and conflicting values in production.
- Review migration behavior for every conflict class.

### Phase 1: Additive schema

- Create `equipment_types`.
- Seed the reviewed canonical equipment types.
- Create `gym_equipment_inventory`, constraints, indexes, triggers, and RLS.
- Do not drop or alter legacy equipment columns.

### Phase 2: Backfill

- Backfill normalized inventory from legacy gym columns.
- Make the operation idempotent.
- Produce validation totals by legacy field and canonical code.
- Record conflicts without silently discarding evidence.

### Phase 3: Shadow reads and write safety

- Add normalized read paths and compatibility adapters.
- Compare normalized results with legacy results for gym detail, search, training,
  and equipment pages.
- Enable atomic dual-write or a controlled write freeze before normalized and
  legacy data can diverge.

### Phase 4: Read cutover

- Switch gym detail pages to normalized inventory.
- Switch search to the normalized database-side query/RPC.
- Switch equipment and training landing pages.
- Monitor error rate, result counts, search latency, and empty-result regressions.

### Phase 5: Write cutover

- Switch submission approval, admin edits, and importers to normalized writes.
- Stop writing legacy equipment columns.
- Retain temporary comparison tooling for a defined observation period.

### Phase 6: Legacy removal

Legacy columns may be dropped only after all exit criteria are met.

Column removal must be a separate migration and release from the initial schema and
backfill.

The removal phase must also update:

- shared `Gym` and `GymSummary` types
- search column lists and filters
- gym detail rendering
- submission field allowlists and payload builders
- importer payloads
- seed data
- schema documentation
- tests and fixtures

---

## FR-11: Validation and Reconciliation

### FR-11.1 Backfill totals

The migration must report, for every mapped legacy field:

- non-null source row count
- true/false or zero/positive distribution
- resulting inventory row count
- conflicts encountered
- rows skipped and reason

### FR-11.2 Gym-level comparison

Validation must compare legacy and normalized effective values for every active gym
and mapped equipment code.

Expected differences must be explicitly classified, for example:

- aliases merged into one canonical code
- child equipment rolling up to parent presence
- contradictory legacy values resolved by precedence

Unclassified differences block read cutover.

### FR-11.3 Search comparison

For each existing equipment filter and training collection, compare:

- matching gym IDs
- total count
- ordering where ordering is part of the existing contract
- district-scoped results

Any intentional result change requires product review and documentation.

### FR-11.4 Production safety

Backfill and validation jobs must be restartable and must avoid long blocking locks
on `public.gyms` during normal traffic.

---

## FR-12: Rollback

Before legacy column removal, rollback must be possible by switching reads and
writes back to the legacy model.

Rollback requirements:

- additive tables remain safe to retain
- no rollback requires deleting normalized inventory
- dual-written changes must be reconciled before legacy mode is treated as fully
  authoritative
- feature/config switches used for read cutover must have a documented owner and
  removal date

After legacy columns are dropped, rollback requires a forward migration or database
restore and is outside the low-risk rollback window.

---

## Acceptance Criteria

The normalization is complete when all of the following are true:

- `equipment_types` contains one reviewed canonical record for every migrated
  equipment concept.
- `gym_equipment_inventory` enforces unique gym/equipment pairs and valid
  presence/quantity combinations.
- Missing inventory rows are treated as unknown everywhere.
- Amenities remain outside the equipment catalog and inventory.
- All active gyms have been backfilled and reconciled against legacy data.
- Known aliases resolve to a single canonical equipment code.
- Parent equipment searches match positive child inventory where required.
- Parent and child quantities are not double-counted.
- Main search, district search, map/split views, equipment pages, and training pages
  filter in the database before pagination.
- Multi-equipment filters return gyms satisfying all selected requirements.
- Gym detail and list reads do not introduce N+1 inventory queries.
- Submission approval updates inventory and audit history atomically.
- All importers use canonical equipment codes or an approved transitional write
  path.
- Public RLS allows valid reads and prevents direct public writes.
- Normalized and legacy comparison tests have no unclassified differences.
- Relevant web typecheck and lint checks pass.
- Legacy columns are removed only in a later release after the observation period
  and all exit criteria pass.

---

## Legacy Removal Exit Criteria

The project may schedule legacy column removal only when:

- no production read references an equipment `has_*` or `*_count` gym column
- no importer, form, API, submission approval path, seed, or admin tool writes a
  legacy equipment column
- no pending legacy submission can bypass payload conversion
- normalized search performance is accepted at production-like data volume
- reconciliation has run after the final legacy write
- rollback and recovery steps have been tested or reviewed
- the observation period has completed without unresolved data drift

---

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Multi-equipment search becomes slower or returns incorrect counts | Use database-side RPC, targeted indexes, and query-plan verification |
| Missing row is accidentally interpreted as absence | Define absence/unknown semantics centrally and test them |
| Legacy aliases create duplicate concepts | Use one reviewed canonical mapping manifest |
| Parent and child quantities are double-counted | Roll up presence only; never sum quantities by default |
| New and legacy data drift during rollout | Use atomic dual-write or a controlled write freeze |
| Submission approval partly succeeds | Apply inventory and audit changes in one transaction |
| Import with missing data erases known inventory | Treat omitted equipment as no change |
| Immediate column removal breaks many consumers | Use additive migrations, shadow reads, and a separate removal release |

---

## Future Considerations

The following may be considered after this normalization is stable:

- normalize amenities into a separate gym amenity model
- support typed attributes such as minimum/maximum dumbbell weight
- add per-inventory source, confidence, and verification timestamps
- connect generic equipment types to brand/model catalog records
- attach catalog or gym-specific equipment images
- add equipment-level change history instead of relying only on submission JSON
- allow trusted owner or community inventory verification
