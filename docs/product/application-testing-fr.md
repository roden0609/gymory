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
- Do not include importer scripts in the initial MVP unless their transformation
  logic is first extracted into testable functions.

---

## Testing Layers

| Layer | Purpose | Initial scope |
| --- | --- | --- |
| Unit | Test deterministic functions and business rules in isolation | Required |
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

## FR-9: API Integration Test Requirements

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

### FR-9.1 Dependency isolation

API tests must not call live Firebase or Supabase services. Authentication and
data-access boundaries should be mocked or injected at module boundaries.

Avoid mocking internal implementation details deeper than necessary.

### FR-9.2 Common cases

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

### FR-9.3 Domain-specific cases

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

## FR-10: Component Test Requirements

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

## FR-11: Verification Workflow

### FR-11.1 Feature changes

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

### FR-11.2 Relevant tests during development

The agent may run a focused test command while iterating, but the full root
`pnpm test` command is still required before completion.

### FR-11.3 Failure handling

- A feature change is not complete while relevant tests fail.
- Do not weaken or delete a valid existing test merely to make a change pass.
- If product behavior intentionally changes, update both the implementation and
  tests, and explain the changed expectation.
- Existing unrelated failures must be reported with the failing command and test
  names.

### FR-11.4 New behavior

Every new or changed deterministic business rule should include:

- at least one successful case
- relevant boundary cases
- at least one invalid or negative case
- a regression test when fixing a bug

---

## FR-12: Coverage and Quality

### FR-12.1 Initial coverage policy

Coverage reporting may be configured during the MVP, but no global percentage
threshold is required initially.

The priority is meaningful branch coverage for the target business rules, not a
high repository-wide percentage.

### FR-12.2 Future thresholds

After the initial suite is stable, the project may introduce thresholds for
high-value logic modules. Any threshold must:

- be enforced in the same command used by automation
- avoid excluding difficult files solely to improve the number
- increase gradually
- not incentivize low-value assertions

### FR-12.3 Test performance

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
- The FR-3 through FR-8 behaviors are covered.
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

