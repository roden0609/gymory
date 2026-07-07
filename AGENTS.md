# Codex Working Notes

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

For frontend changes, run the relevant checks before finishing:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

If `apps/web/tsconfig.tsbuildinfo` changes only because of typecheck, restore it before finalizing unless the user explicitly wants generated files committed.
