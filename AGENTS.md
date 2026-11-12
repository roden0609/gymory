# Codex Working Notes

## Minimum Required Data

For every new or modified function, feature, page, and API, read, process, and return only the data required for its purpose.

- Use explicit database column lists. Avoid `select("*")`, implicit wildcard selects, and fetching full records merely to discard fields later. If a full record is genuinely required, document why at the query.
- Check actual dependencies before narrowing a query: display, SEO, filtering, sorting, joins, RLS policies, views, and downstream helpers may require different fields. A field used only in a database filter does not need to be returned to the caller.
- Keep projections specific to their consumers. Do not expand a shared public query just because an admin or another page needs additional fields; use a separate projection where appropriate.
- Return explicit API response objects and minimal client component props. Do not spread entire database rows into public responses or send internal data to the browser just because the server can read it.
- Use types that describe the selected fields, such as `Pick` or dedicated response types. Do not cast a partial projection to a full database model.
- Enforce public data boundaries in the database as well as in queries. Prefer explicit column-level grants and public views containing only approved fields; retain RLS for row restrictions. New columns must remain private until explicitly approved for public use.
- Keep service-role access server-side. A public page using a server-side admin query does not justify granting public access to the underlying tables or internal columns.
- When changing public data dependencies, update `docs/data/frontend-minimum-data-list.md` and any affected grants or views. Verify required reads and joins still work, private fields remain inaccessible, and row restrictions remain effective.

## Restricted Columns

These values are private. Every future code or schema change must preserve this restriction unless the user explicitly authorizes a change to this policy.

| Table | Restricted columns / values |
| --- | --- |
| `equipment` | `source_url`, `source_external_id`, `official_review_note`, `captured_name`, `captured_name_zh` |
| `equipment_images` | `source_external_key`; `url` on rows where `source_type = 'manual'` |
| `equipment_type_assignments` | `source` |

- Do not expose restricted values to anonymous users or ordinary authenticated users. Access is limited to authorized backend processes and authenticated, authorized admin workflows; using a service-role query does not make its results safe for public output.
- Enforce this at both database and application boundaries. Do not grant public roles (`PUBLIC`, `anon`, `authenticated`) SELECT access to restricted columns, or expose them through views, RPCs, APIs, exports, public logs, caches, HTML, metadata, structured data, React Server Component payloads, or client props.
- For the conditional restriction on `equipment_images.url`, keep the base column private and use an explicitly approved safe projection if non-manual URLs are needed. Never rely on frontend filtering to hide manual URLs. Include `source_type` in backend checks when deciding whether a URL may be returned; do not return it merely for this check.
- Do not bypass these restrictions by copying, aliasing, transforming, or falling back to restricted values in public fields. In particular, do not publish `captured_name` or `captured_name_zh` through `name`, `name_zh`, or another public field. Independently approved public data is not restricted merely because its text happens to match a private value.
- Before changing related reads, writes, migrations, grants, views, helpers, or serializers, trace downstream public consumers and derived fields. Add or update relevant permission and response tests to verify that public reads fail and restricted values cannot leak through indirect output, while authorized admin access still works. Keep `docs/data/frontend-minimum-data-list.md` consistent with this policy.
- Existing code is not an exception to this policy. If a relevant change reveals an existing exposure, fix it within the authorized scope or explicitly report it; never silently preserve or expand it.

## Mobile Responsive Safety

Before and after any UI/layout change, check that the change does not break mobile responsive design.

Required checks for UI work:

- Inspect affected components for fixed widths, `min-width`, `w-screen`, `100vw`, long unwrapped text, wide grids, absolute/fixed elements, and third-party widgets that can overflow.
- Prefer `min-w-0`, `max-w-full`, wrapping text, responsive grid/flex layouts, and clipped wrappers for embedded/map/canvas content.
- Do not introduce horizontal page scrolling on mobile.
- Test at least 320px and 375px viewport widths when the change touches search, filters, cards, navigation, maps, district browse controls, or any mobile-visible layout.
- For search pages, verify these states when relevant:
  - `/zh-HK/search`
  - `/zh-HK/districts/yau-tsim-mong`
  - `/zh-HK/search?userLat=22.3&userLng=114.1`
  - `/zh-HK/search?view=map`
  - `/zh-HK/search?view=split`

When browser verification is available, confirm:

```js
document.documentElement.scrollWidth <= window.innerWidth &&
  document.body.scrollWidth <= window.innerWidth
```

If a third-party component, such as Leaflet, positions internal elements outside its own bounds, make sure the page-level `scrollWidth` still matches the viewport and the overflowing internals are clipped by an appropriate wrapper.

## Verification

After every feature change, run the unit test suite before finishing:

```bash
pnpm test
```

For frontend changes, run the relevant checks before finishing:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

If `apps/web/tsconfig.tsbuildinfo` changes only because of typecheck, restore it before finalizing unless the user explicitly wants generated files committed.
