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
