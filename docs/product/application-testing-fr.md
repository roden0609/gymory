# Functional Requirements: Application Testing

## Status

Proposed.

At the time of writing:

- The repository root defines `"test": "turbo test"`.
- `apps/web` and `packages/shared` do not define a `test` script.
- No unit test runner is configured.
- No `*.test.*` or `*.spec.*` application test files exist.
- Running the root command therefore does not provide meaningful feature
  regression coverage.

This document defines the target testing foundation and the initial automated
test coverage for Gymory.

---

## Overview

Gymory contains business rules for equipment normalization, submissions,
training collections, search-page definitions, localization, and SEO. Many of
these rules are implemented as deterministic TypeScript functions and can be
tested quickly without a browser or live database.

The project needs a reliable automated test suite that Codex and developers run
after every feature change. The first phase should prioritize high-value unit
tests, followed by API integration tests. Browser and responsive-layout checks
remain a separate layer.

---

## Goals

- Make `pnpm test` run real tests across the monorepo.
- Provide fast, deterministic tests for business-critical pure functions.
- Prevent regressions in equipment normalization and submission comparisons.
- Verify training, equipment, district, localization, and SEO rules.
- Verify importer parsing, normalization, validation, and write planning against
  deterministic source fixtures.
- Establish conventions for tests added by future feature work.
- Make failures easy to understand and reproduce locally.
- Keep unit tests independent of production services and network access.

---

## Non-Goals

- Do not require a live Supabase, Firebase, GA4, Mapbox, or other external
  service for unit tests.
- Do not use unit tests as a substitute for database integration tests.
- Do not use unit tests to verify visual layout, mobile overflow, map rendering,
  or browser compatibility.
- Do not require 100% line or branch coverage.
- Do not add brittle snapshot tests for large React component trees.
- Do not test third-party library behavior unless Gymory wraps or transforms it.
- Do not require live importer source websites to be available for the default
  unit test command.
- Do not write importer test data to production Supabase projects.

---

## Testing Layers

| Layer | Purpose | Initial scope |
| --- | --- | --- |
| Unit | Test deterministic functions and business rules in isolation | Required |
| Importer fixture | Test source parsing, field mapping, validation, and dry-run output without network access | Required |
| Component | Test important user-visible React behavior | Limited, after unit MVP |
| API integration | Test route validation, authorization, orchestration, and error mapping with controlled dependencies | Phase 2 |
| Database integration | Test SQL constraints, migrations, RLS, and query behavior against an isolated database | Future |
| Browser/E2E | Test complete user journeys and responsive behavior | Future/separate requirement |

Tests must be placed in the correct layer. For example, a 320px horizontal
overflow check is a browser test, not a unit test.

---

## MVP Scope

The MVP must include:

- A TypeScript-compatible test runner.
- Workspace-level test scripts that are invoked by `pnpm test`.
- Initial unit tests for:
  - equipment inventory normalization
  - submission change comparison
  - training collection rules
  - SEO and localized URL helpers
  - equipment page definitions
  - district page definitions
  - slug conversion
  - importer argument parsing, source parsing, mapping, validation, and normalized
    output using committed fixtures
  - shared importer upsert planning and change detection
- Test documentation and naming conventions.
- A passing full test command from the repository root.

The MVP may defer:

- React component tests.
- API route integration tests.
- Database integration tests.
- Browser/E2E tests.
- Coverage enforcement thresholds.

---

## FR-1: Test Runner and Workspace Configuration

### FR-1.1 Test runner

Use Vitest unless the implementation discovers a repository constraint that
requires another runner.

The runner must:

- support TypeScript without a separate compile step
- support ESM modules
- produce readable terminal output
- exit non-zero when any test fails
- work with the existing pnpm and Turborepo structure

### FR-1.2 Workspace scripts

Every workspace containing tests must define a `test` script.

Expected initial scripts:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

The exact command may include a local config path if necessary.

The root command must remain:

```bash
pnpm test
```

It must invoke all relevant workspace test tasks through Turborepo.

### FR-1.3 Watch mode

Each tested workspace should provide a developer watch command:

```json
{
  "scripts": {
    "test:watch": "vitest"
  }
}
```

Watch mode is for local development and must not be used by the root verification
command.

### FR-1.4 Test environment

- Pure-function tests should use the Node environment.
- A DOM environment should only be added when component tests require it.
- Unit tests must not read production credentials.
- Unit tests must not make network requests.
- Unit tests must not mutate a shared database or filesystem state.
- Environment variables changed by a test must be restored after that test.

### FR-1.5 Path aliases and workspace imports

Tests must support the existing TypeScript path aliases and
`@gymory/shared` workspace import.

Do not duplicate application constants inside test configuration merely to make
imports pass.

### FR-1.6 Turborepo behavior

The `test` task must declare appropriate inputs so test results are invalidated
when application code, test code, test configuration, or relevant package
metadata changes.

Test tasks must not depend on a production build.

---

## FR-2: Test Organization and Conventions

### FR-2.1 File placement

Prefer colocated test files:

```text
equipment-inventory.ts
equipment-inventory.test.ts
```

An existing feature-specific test directory may be used when several files share
fixtures, but tests should remain easy to locate with `rg --files`.

### FR-2.2 Naming

- Test files use `*.test.ts` or `*.test.tsx`.
- `describe` blocks name the exported unit or business rule.
- Test names describe observable behavior, not implementation steps.
- Regression tests should describe the input condition and expected outcome.

Example:

```ts
it("treats a positive quantity as present even when a legacy flag is false")
```

### FR-2.3 Test structure

Tests should use Arrange, Act, Assert structure where it improves readability.

Prefer small explicit fixtures over large production-like objects. Shared fixture
builders may be introduced for types such as `GymSummary` when they reduce noise
without hiding relevant values.

### FR-2.4 Assertions

- Assert public outputs and externally observable effects.
- Avoid assertions against private implementation details.
- Prefer exact result assertions for transformations and mappings.
- Avoid large snapshots for business logic.
- Error tests must assert the error type or meaningful message/status, not only
  that an error occurred.

### FR-2.5 Determinism

Tests must not depend on:

- current wall-clock time, unless time is explicitly controlled
- random values, unless a seed is fixed
- test execution order
- locale or timezone inherited from the developer machine
- production data
- external network availability

---

## FR-3: Equipment Inventory Normalization Tests

Target:

```text
packages/shared/src/equipment-inventory.ts
```

This is the highest-priority unit-test area.

### FR-3.1 Legacy field detection

Tests must verify:

- equipment-related `has_*` fields are accepted
- equipment-related `*_count` fields are accepted
- non-equipment fields are rejected
- all known amenity fields remain excluded:
  - `has_washroom`
  - `has_bathroom`
  - `has_changing_room`
  - `has_free_water`
  - `has_dry_sauna`
  - `has_wet_sauna`
  - `has_ice_bath`

### FR-3.2 Field-to-code conversion

Tests must verify:

- the `has_` prefix is removed
- the `_count` suffix is removed
- known overrides map to their canonical codes
- aliases such as singular/plural legacy names resolve to the same code
- amenity and unsupported fields return `null`

### FR-3.3 Patch creation

Tests must cover:

- boolean presence set to `true`
- boolean presence set to `false`
- a positive integer quantity
- a zero quantity
- presence and quantity fields that map to the same code
- positive quantity taking precedence over a false legacy presence flag
- true presence with zero quantity preserving known presence without claiming an
  exact quantity
- duplicate aliases resolving to a single patch item
- deterministic alphabetical patch ordering
- `null` and `undefined` inputs
- invalid negative quantities
- invalid fractional quantities
- values with unsupported types

### FR-3.4 Previous-value comparisons

Tests must cover:

- unchanged resolved values producing no patch
- changed presence producing an update
- changed quantity producing an update
- a previously known item missing from the current values producing a removal
- an item absent in both current and previous values producing no patch
- alias changes that resolve to the same canonical value producing no patch

---

## FR-4: Submission Change Comparison Tests

Target:

```text
apps/web/src/lib/submission-change-comparison.ts
```

### FR-4.1 JSON equality

Tests must verify:

- equal primitives
- different primitives
- `null` handling
- equal arrays
- array order differences
- nested arrays and objects
- equal objects with different key insertion order
- missing object keys
- an array is not equal to an object

### FR-4.2 Building comparisons

Tests must verify:

- only changed fields are returned
- unchanged fields are omitted
- missing `before` values are represented as `null`
- `beforeCaptured` is `true` for comparisons built from before/after records
- missing `after` produces an empty comparison
- nested values are compared structurally

### FR-4.3 Resolving payload formats

Tests must verify the supported precedence:

1. a valid existing `changeComparison`
2. `before` and `after` records
3. legacy `changedFields`
4. an empty comparison when no valid source exists

Legacy `changedFields` entries must have `beforeCaptured: false`.

Malformed comparison objects must not be accepted as valid comparisons.

### FR-4.4 Merging

Tests must verify:

- null and undefined comparisons are ignored
- fields from multiple comparisons are preserved
- later comparisons overwrite earlier entries for the same field

---

## FR-5: Training Collection Tests

Target:

```text
apps/web/src/lib/training-pages.ts
```

Use a typed `GymSummary` fixture builder whose default fields are `null` or false
as appropriate. Each test must explicitly set the fields relevant to its rule.

### FR-5.1 Definition lookup

Tests must verify:

- every supported slug resolves to the correct definition
- an unknown slug returns `null`
- collection search query generation is URL-safe and deterministic

### FR-5.2 Match rules

Tests must cover positive, negative, zero, null, and boundary cases for:

- HYROX official
- HYROX friendly
- Olympic lifting
- powerlifting
- bodybuilding
- hybrid training

For rules with multiple required groups, tests must prove that:

- all required groups must pass
- valid alternatives inside an OR group are accepted
- one missing required condition causes the gym not to match

Bodybuilding tests must exercise the threshold immediately below, at, and above
the required count for each equipment group.

### FR-5.3 Signals

Tests must verify:

- signals are emitted only for present booleans or positive counts
- zero and null counts do not emit count signals
- quantity values are preserved
- expected label keys are emitted
- unrelated equipment does not create a signal

### FR-5.4 Definition integrity

Add a table-driven integrity test that verifies:

- training slugs are unique
- equipment link slugs are non-empty
- each definition has a non-empty filter
- every definition produces a collection query using its own slug

---

## FR-6: Equipment and District Page Definition Tests

Targets:

```text
apps/web/src/lib/equipment-pages.ts
apps/web/src/lib/district-pages.ts
```

### FR-6.1 Equipment definitions

Tests must verify:

- every supported equipment slug resolves correctly
- unknown slugs return `null`
- generated search queries match each definition's `searchParams`
- boolean, `gt`, and `gte` filters retain the expected field and value
- special OR definitions such as deadlift platform and wall ball remain intact
- equipment slugs are unique
- generated query strings can be parsed back to the expected parameters

### FR-6.2 District definitions

Tests must verify:

- every `HK_DISTRICTS` entry produces one page definition
- district codes and slugs are unique
- ampersands become `and`
- spaces become hyphens
- lookups by code and slug return the expected district
- unknown code and slug values return `null`
- English and Traditional Chinese labels are selected correctly

---

## FR-7: SEO and Localization Helper Tests

Target:

```text
apps/web/src/lib/seo.ts
```

### FR-7.1 Base URL

Tests must verify:

- the default URL is `https://gymory.io`
- `NEXT_PUBLIC_APP_URL` overrides the default
- one or more trailing slashes are removed
- environment state is restored after each test

### FR-7.2 Localized paths and URLs

Tests must verify:

- locale-only root paths
- paths with and without a leading slash
- nested paths
- localized absolute URL generation
- no accidental double slash between host, locale, and path

### FR-7.3 Alternates and metadata

Tests must verify:

- canonical path uses the requested locale
- all supported locales are included in `languages`
- `x-default` uses the configured default locale
- `en` maps to `en_US`
- `zh-HK` maps to `zh_HK`
- alternate Open Graph locales are correct
- title, description, robots, canonical, Open Graph, and Twitter values are
  preserved in generated metadata
- unsupported locale input safely uses the documented fallback behavior

---

## FR-8: Slug Conversion Tests

Target:

```text
apps/web/src/lib/utils/slug.ts
```

Tests must verify:

- conversion to lower case
- trimming leading and trailing whitespace
- spaces converted to hyphens
- repeated spaces and hyphens collapsed
- punctuation removed
- existing valid hyphens preserved
- empty input produces an empty string
- punctuation-only input produces an empty string

The current implementation removes Chinese characters. The initial test must
document this current behavior rather than silently changing product behavior.
Supporting Chinese slugs requires a separate product decision and implementation.

---

## FR-9: Importer Test Requirements

Targets:

```text
scripts/import-anytime-fitness-hk.mjs
scripts/import-247-fitness-hk.mjs
scripts/import-efx24-hk.mjs
scripts/import-go24-fitness-hk.mjs
scripts/import-hyrox-official-hk.mjs
scripts/import-lcsd-fitness-hk.mjs
scripts/import-pure-fitness-hk.mjs
scripts/import-snap-fitness-hk.mjs
scripts/lib/upsert-gyms-with-submissions.mjs
```

Importer tests are part of the required application test suite. The default
`pnpm test` command must test importer behavior without calling live websites or
Supabase.

### FR-9.1 Testable importer architecture

Each importer must separate deterministic behavior from command-line side
effects.

The implementation should either:

- extract importer logic into `packages/importers`, leaving `scripts/import-*.mjs`
  as thin CLI entry points; or
- export testable parsing and mapping functions from dedicated modules under
  `scripts/lib/importers`.

The preferred structure is:

```text
packages/importers/src/<source>/
  parse.ts
  map.ts
  validate.ts
  index.ts
scripts/import-<source>.mjs
```

Importing a parser or mapper in a test must not:

- execute `main()`
- read local environment files
- fetch a remote URL
- write an output file
- call Supabase
- call `process.exit`

CLI entry points must only execute when invoked directly.

### FR-9.2 Source fixtures

Each importer must have at least one committed, sanitized source fixture that
represents the smallest useful upstream response.

Recommended location:

```text
packages/importers/test/fixtures/<source>/
```

Fixture requirements:

- use HTML or JSON matching the real upstream format
- contain no credentials, session cookies, access tokens, or personal data
- remain small enough to review in source control
- include source-format edge cases relevant to that importer
- record the capture date and source URL in an adjacent README or fixture note
- avoid large full-site dumps when a minimal response is sufficient

Tests must never overwrite committed fixtures.

### FR-9.3 Argument parsing and safety defaults

Tests must verify, where supported:

- dry run is the default
- `--upsert` is required before any database write
- `--out` selects the requested output path
- fixture/input-file arguments bypass live fetching
- district override arguments are parsed correctly
- unknown or malformed arguments fail with a meaningful error
- missing credentials fail before an upsert request is made
- normal dry runs do not require Supabase credentials

### FR-9.4 Parsing and mapping

Every importer must test:

- extraction of the upstream location identifier
- English and Traditional Chinese names where available
- English and Traditional Chinese addresses where available
- deterministic slug generation
- latitude and longitude parsing
- district inference and explicit overrides
- website, phone, and other supported contact fields
- chain/source metadata
- active/inactive behavior when exposed upstream
- equipment fields when exposed upstream
- unknown upstream fields being ignored safely
- missing optional values remaining `null` rather than becoming false, zero, or
  an empty string without a product rule

Expected mapped rows should be asserted exactly for the fields controlled by the
importer.

### FR-9.5 Validation and edge cases

Tests must cover relevant failure and boundary cases:

- empty upstream response
- malformed JSON or HTML
- missing required upstream identifier
- missing name
- invalid coordinates
- unresolved district
- duplicate source records
- duplicate generated slugs
- conflicting English and Chinese records
- upstream records outside Hong Kong when a source contains multiple regions
- changes in wrapper structure that result in no parsed locations

An importer must fail loudly when a structural upstream change would otherwise
produce a misleading empty or partial import.

### FR-9.6 Output determinism

For the same fixture and options, importer output must be deterministic.

Tests must verify:

- stable row ordering
- stable slug generation
- stable JSON-compatible output
- no current timestamp in compared output unless time is explicitly injected
- identical results across repeated runs

Large output snapshots should not be used. Prefer exact assertions against small
fixtures or focused field assertions for larger rows.

### FR-9.7 Shared normalized upsert behavior

Tests for `upsert-gyms-with-submissions.mjs` must verify:

- amenity fields remain on the gym row
- compatibility equipment fields are removed from the gym row
- equipment aliases resolve to canonical codes
- boolean presence and quantity conflicts follow normalization rules
- unchanged gym fields do not produce an update
- unchanged inventory does not produce an equipment patch
- new gyms produce the expected add-gym submission plan
- changed gyms produce the expected edit submission comparison
- equipment changes preserve before/after comparison data
- importer-owned fields and non-importer-owned fields follow the documented
  overwrite policy
- network failures and non-success Supabase responses produce meaningful errors

#### FR-9.7.1 Null and overwrite matrix

Tests must cover the complete gym-field overwrite matrix documented in
`scripts/README.md`:

| New import value | Existing database value | Expected result |
| --- | --- | --- |
| `null` | has a value | Preserve the database value and remove the field from the PATCH payload |
| has a value | `null` | Include the imported value in the PATCH payload |
| has a value | has a different value | Include the imported value in the PATCH payload |
| has a value | has the same value | Do not treat the field as changed |
| `null` | `null` | Do not treat the field as changed |
| field omitted | any value | Preserve the database value and do not include the field in the PATCH payload |

The tests must prove that imported `null` values never erase existing non-null
gym data.

The same matrix must be exercised with representative string, number, boolean,
array, and JSON object fields where those shapes are supported by imported gym
rows.

#### FR-9.7.2 Ignored change-detection fields

Changes to the following fields must not create a meaningful gym change by
themselves:

- `data_source`
- `created_at`
- `updated_at`
- `last_reported_at`

Tests must verify that when these are the only differing fields:

- no gym PATCH request is made
- no `edit_gym_info` submission is created
- the importer reports no meaningful gym-field change

If another meaningful field changes in the same row, the ignored fields must not
appear in `changed_fields` or the change comparison.

#### FR-9.7.3 Equipment no-change and explicit-value semantics

Equipment tests must distinguish omitted or unknown data from explicit values:

| Imported equipment value | Expected behavior |
| --- | --- |
| field omitted | Preserve existing inventory; no equipment patch |
| `null` or `undefined` | Preserve existing inventory; no equipment patch |
| explicit `false` presence | Write confirmed absence when it differs from existing inventory |
| explicit quantity `0` | Write the normalized known-zero/absence result when it differs |
| positive integer quantity | Write present with that quantity when it differs |
| same resolved value through a legacy alias | No equipment patch |
| invalid negative or fractional quantity | Reject or ignore according to the documented validation rule; never write it |

When neither gym fields nor equipment inventory has a meaningful change, tests
must verify that the importer does not:

- PATCH the gym
- call the normalized equipment inventory RPC
- create an `edit_gym_info` submission
- create an `edit_equipment` submission

Explicit equipment changes must produce only the required inventory RPC and
approved `edit_equipment` submission behavior, without restoring compatibility
equipment columns to the `gyms` write.

Pure change-detection and request-planning functions should be extracted and
unit tested. HTTP behavior may be tested with an injected or mocked `fetch`.

No test may use a production Supabase URL or secret.

### FR-9.8 Dry-run integration tests

Each importer must have a fixture-based dry-run integration test that exercises:

```text
fixture input -> parse -> map -> validate -> sort -> output rows
```

The integration test must assert:

- successful exit/result
- expected number of rows
- expected representative rows
- no database write calls
- no network call when fixture input is supplied
- a clear summary containing the importer name and row count, if the CLI summary
  is part of the public command behavior

Tests should call an exported runner with injected dependencies instead of
spawning a child process unless CLI process behavior itself is under test.

### FR-9.9 Live source smoke tests

Live smoke tests are optional operational checks and must be separate from the
default unit suite.

Recommended command:

```bash
pnpm test:importers:live
```

Live smoke tests must:

- be read-only and dry-run only
- never pass `--upsert`
- use explicit timeouts
- perform a minimal request volume
- verify that at least one valid Hong Kong location can be parsed
- redact response headers, cookies, tokens, and credentials from logs
- fail with a source-specific structural error
- run manually or on a scheduled workflow, not on every feature change

A live-source failure must not be treated automatically as an application code
regression until upstream availability and format have been checked.

### FR-9.10 Initial importer rollout order

Implement importer coverage in this order:

1. Shared `upsert-gyms-with-submissions` normalization and change planning.
2. One representative JSON/API importer, preferably 24/7 Fitness.
3. One representative HTML importer.
4. Remaining chain importers using the established fixture pattern.
5. LCSD and HYROX importers, including their source-specific edge cases.

The initial importer testing milestone is complete only when all currently
supported import commands have at least one fixture-based dry-run integration
test.

---

## FR-10: API Integration Test Requirements

This is Phase 2 and should begin after the unit-test MVP is stable.

Initial API targets:

```text
apps/web/src/app/api/gyms/route.ts
apps/web/src/app/api/gyms/[id]/route.ts
apps/web/src/app/api/gyms/[id]/equipment/route.ts
apps/web/src/app/api/gyms/[id]/accuracy-vote/route.ts
apps/web/src/app/api/search/route.ts
apps/web/src/app/api/submissions/route.ts
apps/web/src/app/api/admin/submissions/[id]/route.ts
apps/web/src/app/api/users/me/route.ts
apps/web/src/app/api/users/me/avatar/route.ts
```

### FR-10.1 Dependency isolation

API tests must not call live Firebase or Supabase services. Authentication and
data-access boundaries should be mocked or injected at module boundaries.

Avoid mocking internal implementation details deeper than necessary.

### FR-10.2 Common cases

Relevant routes must test:

- unauthenticated access
- authenticated non-admin access
- authenticated admin access
- valid request input
- malformed JSON
- schema validation failures
- missing required records
- successful response shape and status
- controlled data-layer failures
- safe error status and response body

### FR-10.3 Domain-specific cases

Tests should include:

- gym create, update, and delete authorization
- equipment inventory update validation
- duplicate or invalid accuracy votes
- search parameter validation and normalized output
- submission creation and change-comparison payload
- submission approval and rejection
- user profile and avatar ownership validation

Route tests must not assert secrets, raw internal exception text, or production
identifiers in public error responses.

---

## FR-11: Component Test Requirements

Component tests are not required for the initial MVP. When introduced, prioritize
observable behavior in:

- `SearchFilters`
- `SearchExperience`
- `GymList`
- `SubmitGymForm`
- `GymAccuracyVoting`
- admin submission review controls

Relevant component cases include:

- user actions update the expected state or URL parameters
- validation messages are accessible
- loading, error, empty, and success states
- buttons are disabled during pending actions
- duplicate submissions are prevented
- keyboard-accessible form behavior

Do not use component tests to claim that responsive layout is safe. Mobile
overflow must be checked in a real browser at 320px and 375px as required by the
repository instructions.

---

## FR-12: Verification Workflow

### FR-12.1 Feature changes

After every feature change, the implementation agent must run:

```bash
pnpm test
```

For frontend changes, it must also run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

If `apps/web/tsconfig.tsbuildinfo` changes only because of typecheck, restore it
before finalizing unless generated-file changes are explicitly requested.

### FR-12.2 Relevant tests during development

The agent may run a focused test command while iterating, but the full root
`pnpm test` command is still required before completion.

### FR-12.3 Failure handling

- A feature change is not complete while relevant tests fail.
- Do not weaken or delete a valid existing test merely to make a change pass.
- If product behavior intentionally changes, update both the implementation and
  tests, and explain the changed expectation.
- Existing unrelated failures must be reported with the failing command and test
  names.

### FR-12.4 New behavior

Every new or changed deterministic business rule should include:

- at least one successful case
- relevant boundary cases
- at least one invalid or negative case
- a regression test when fixing a bug

---

## FR-13: Coverage and Quality

### FR-13.1 Initial coverage policy

Coverage reporting may be configured during the MVP, but no global percentage
threshold is required initially.

The priority is meaningful branch coverage for the target business rules, not a
high repository-wide percentage.

### FR-13.2 Future thresholds

After the initial suite is stable, the project may introduce thresholds for
high-value logic modules. Any threshold must:

- be enforced in the same command used by automation
- avoid excluding difficult files solely to improve the number
- increase gradually
- not incentivize low-value assertions

### FR-13.3 Test performance

The initial unit suite should remain fast enough to run after every feature
change. As a target, the pure-function suite should complete within 10 seconds on
a typical development machine, excluding dependency installation and Turborepo
startup overhead.

---

## Implementation Phases

### Phase 1A: Foundation

- Install and configure Vitest.
- Add workspace `test` and `test:watch` scripts.
- Confirm `pnpm test` discovers tests and returns the correct exit status.
- Add one deliberately simple smoke test, then replace it with real domain tests.

### Phase 1B: Core business rules

Implement tests for:

1. `equipment-inventory.ts`
2. `submission-change-comparison.ts`
3. `training-pages.ts`
4. `seo.ts`

### Phase 1C: Mapping helpers

Implement tests for:

1. `equipment-pages.ts`
2. `district-pages.ts`
3. `slug.ts`

### Phase 1D: Importer fixtures and deterministic runners

- Extract importer parsing, mapping, validation, and orchestration from CLI side
  effects.
- Add the shared importer test package or module structure.
- Add sanitized fixtures for every supported source.
- Test shared equipment normalization and upsert change planning.
- Add one fixture-based dry-run integration test for every import command.
- Keep live-source smoke tests outside `pnpm test`.

### Phase 2: API routes

- Establish route-test dependency boundaries.
- Add authentication and validation cases.
- Add success and controlled-failure cases.

### Phase 3: Components and browser journeys

- Add behavior-focused component tests where they provide value.
- Define separate E2E requirements for search, submissions, admin review, and
  responsive layout.

---

## Acceptance Criteria

The unit-test MVP is complete when:

- `pnpm test` runs real tests in every relevant workspace.
- The command exits zero only when all discovered tests pass.
- No unit test contacts a live external service.
- The FR-3 through FR-9 behaviors are covered.
- Every supported importer has a deterministic fixture-based dry-run test.
- Importer tests prove that fixture mode performs no network or database writes.
- Tests pass when executed from a clean repository checkout after dependencies
  are installed.
- Test files are type-safe and lint clean.
- `pnpm --filter web typecheck` passes.
- `pnpm --filter web lint` passes.
- Test output clearly identifies the failing file and case when a regression is
  introduced.
- The repository instructions continue to require `pnpm test` after every
  feature change.

---

## Recommended Initial Deliverables

Expected implementation changes include, but are not limited to:

```text
package.json
pnpm-lock.yaml
turbo.json
apps/web/package.json
apps/web/vitest.config.ts
apps/web/src/lib/**/*.test.ts
packages/shared/package.json
packages/shared/vitest.config.ts
packages/shared/src/**/*.test.ts
packages/importers/package.json
packages/importers/vitest.config.ts
packages/importers/src/**/*.{ts,test.ts}
packages/importers/test/fixtures/**/*
scripts/import-*.mjs
scripts/lib/upsert-gyms-with-submissions.mjs
```

The implementer may use a shared Vitest configuration if it reduces duplication
without making workspace resolution harder to understand.

---

## Open Decisions

The following decisions are intentionally deferred:

- Whether CI should run tests in a separate workflow or as part of an existing
  verification job.
- Whether to enforce coverage thresholds.
- Whether React component tests should use Testing Library.
- Whether API integration tests should use module mocks, dependency injection, or
  a local test database for each boundary.
- Whether browser/E2E tests should use Playwright.
- Whether Chinese input should be supported by `toSlug`.
- Whether live importer smoke tests should run manually only or in a scheduled
  GitHub Actions workflow.
- How long importer fixtures should be retained after an upstream source format
  changes.
