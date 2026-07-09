# GA4 Event Tracking Feature Request for Gymory

## Background

Gymory currently has Google Analytics 4, Google Search Console, and Vercel Analytics set up. GA4 can already track page views, traffic acquisition, landing pages, and basic engagement.

However, GA4 does not currently tell us what users actually do inside Gymory after they land on the site.

We want to add custom GA4 event tracking so we can understand:

- What users search for
- Which gyms they view
- Which equipment filters they use
- Which external links they click
- Whether users submit gym updates successfully
- Which pages or features are actually useful

This feature should be implemented in a clean, reusable way for the existing Next.js app.

---

## Goal

Implement a small GA4 analytics helper and track the most important Gymory user actions as custom GA4 events.

The implementation should be lightweight, type-safe where possible, and safe to call in the browser only.

---

## Requirements

### 1. Create a reusable analytics helper

Create a helper file, for example:

```ts
// apps/web/src/lib/analytics.ts
```

or the closest existing equivalent path.

The helper should expose a function like:

```ts
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", eventName, params);
}
```

If TypeScript complains that `window.gtag` does not exist, add a global type declaration.

Example:

```ts
declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}
```

The helper must not break server-side rendering.

---

## Gymory Implementation Context

Gymory is a Next.js App Router app. GA4 is already installed in the root layout through `@next/third-parties/google`, and Vercel Analytics is already enabled.

Most route pages, including gym detail pages and equipment landing pages, are Server Components. Any event that depends on `window.gtag` must be fired from a Client Component, for example a small `AnalyticsEventOnMount` component that runs once in `useEffect`.

Gymory search is currently mostly filter-driven rather than free-text driven:

- `/search` uses `SearchFilters` to update URL query params with a short debounce.
- Equipment filters are represented by params such as `hasSkiErg=true`, `hasSled=true`, `minRackCount=1`, or `brandSlugs=eleiko`.
- Equipment landing pages use slugs such as `hack-squat`, `ski-erg`, `power-rack`, and `heavy-dumbbells`.

Because of this, do not force every filter change into GA4's recommended `search` event. Use `search` only for genuine keyword or submitted search actions. Use custom filter events for filter-driven browsing.

---

## Recommended GA4 Events

### 1. `search`

Track when a user performs a search.

Use GA4's recommended event name `search`.

Parameters:

```ts
{
  search_term: string;
  source?: "homepage" | "search_page" | "navbar" | "unknown";
}
```

Example:

```ts
trackEvent("search", {
  search_term: query,
  source: "search_page",
});
```

Use this when:

- User submits a search box
- User searches for a gym name
- User searches for equipment
- User searches for district or keyword

Do not fire this event on every keystroke. Fire only when the search is submitted or meaningfully applied.

Gymory-specific note:

- At the time of writing, `/search` is mostly controlled by filters, not a keyword search box.
- Do not emit `search` for every `SearchFilters` URL update.
- If a keyword search field is added later, use the submitted query as `search_term`.
- For filter-only actions, use `equipment_filter`, `gym_brand_filter`, `equipment_brand_filter`, `district_filter`, or `filter_apply` instead.

---

### 2. `view_gym`

Track when a user opens or views a gym detail page.

Parameters:

```ts
{
  gym_slug: string;
  gym_name?: string;
  district?: string;
  chain?: string;
  locale?: string;
}
```

Example:

```ts
trackEvent("view_gym", {
  gym_slug: gym.slug,
  gym_name: gym.name,
  district: gym.district,
  chain: gym.chain,
  locale,
});
```

Use this on gym detail pages, ideally once per page view.

This helps us understand which gyms users actually care about beyond raw page views.

Gymory-specific implementation:

- The gym detail route is a Server Component.
- Add a tiny Client Component that receives the gym metadata as props and fires this event once in `useEffect`.
- Do not send the user's profile, email, phone number, or any free-text submission content.

---

### 3. `view_equipment`

Track when a user views an equipment landing page.

Parameters:

```ts
{
  equipment: string;
  locale?: string;
}
```

Example:

```ts
trackEvent("view_equipment", {
  equipment: "hack-squat",
  locale,
});
```

Use this on pages such as:

```txt
/equipment/hack-squat
/equipment/power-rack
/equipment/ski-erg
```

This helps us identify which equipment pages have real user interest.

Gymory-specific implementation:

- Use the equipment page slug from `EQUIPMENT_PAGE_DEFINITIONS`, for example `hack-squat`, `ski-erg`, `power-rack`, `heavy-dumbbells`, or `eleiko`.
- Fire from a Client Component mounted by the equipment landing page.

---

### 4. `view_training_collection`

Track when a user views a training collection page.

Parameters:

```ts
{
  training_collection: string;
  district?: string;
  locale?: string;
}
```

Example:

```ts
trackEvent("view_training_collection", {
  training_collection: "hyrox-official-hong-kong",
  district: "wan-chai",
  locale,
});
```

Use this on pages such as:

```txt
/hyrox-official-hong-kong
/olympic-lifting-hong-kong
/powerlifting-hong-kong
/bodybuilding-hong-kong
/hybrid-training-hong-kong
/hyrox-official-hong-kong/districts/wan-chai
```

Gymory-specific implementation:

- Fire from a Client Component mounted by `TrainingCollectionPage`.
- Use the training page slug as `training_collection`.
- Include the district page slug when the page is scoped to a district.

---

### 5. `equipment_filter`

Track when a user applies or toggles an equipment filter.

Parameters:

```ts
{
  equipment: string;
  filter_param?: string;
  selected: boolean;
  source?: "search_page" | "gym_list" | "equipment_page" | "unknown";
}
```

Example:

```ts
trackEvent("equipment_filter", {
  equipment: "ski-erg",
  filter_param: "hasSkiErg",
  selected: true,
  source: "search_page",
});
```

Use this when:

- User selects an equipment filter
- User removes an equipment filter
- User filters gyms by equipment

This is one of the most important events for Gymory because the product is equipment-driven.

Gymory-specific implementation:

- Track checkbox-style equipment filters when users toggle them in `SearchFilters`.
- Use a stable, human-readable slug for `equipment` where possible, and include the actual URL query param in `filter_param`.
- For numeric filters such as `minRackCount`, `minPlatformCount`, `minDumbbellWeight`, and `minPlateWeight`, either map them to an equipment slug such as `power-rack` / `deadlift-platform` / `heavy-dumbbells`, or track them with a separate `filter_apply` event.
- Avoid firing duplicate events from both the checkbox handler and the debounced URL sync.

---

### 6. `gym_brand_filter`

Track when a user applies or removes a gym brand / chain filter.

Parameters:

```ts
{
  gym_chain: string;
  filter_param?: string;
  selected: boolean;
  source?: "search_page" | "gym_list" | "equipment_page" | "unknown";
}
```

Example:

```ts
trackEvent("gym_brand_filter", {
  gym_chain: "pure-fitness",
  filter_param: "gymChains",
  selected: true,
  source: "search_page",
});
```

Gymory-specific implementation:

- Track `gymChains` checkbox changes separately from equipment filters.
- Use the gym chain slug as `gym_chain`.
- Fire `selected: false` when the user unticks a chain or clears all filters.

---

### 7. `equipment_brand_filter`

Track when a user applies or removes an equipment brand filter.

Parameters:

```ts
{
  equipment_brand: string;
  filter_param?: string;
  selected: boolean;
  source?: "search_page" | "gym_list" | "equipment_page" | "unknown";
}
```

Example:

```ts
trackEvent("equipment_brand_filter", {
  equipment_brand: "eleiko",
  filter_param: "brandSlugs",
  selected: true,
  source: "search_page",
});
```

Gymory-specific implementation:

- Track `brandSlugs` checkbox changes separately from gym chain filters.
- Use the equipment brand slug as `equipment_brand`.
- Fire `selected: false` when the user unticks a brand or clears all filters.

---

### 8. `district_filter`

Track when a user selects or clears a district filter.

Parameters:

```ts
{
  district: string;
  filter_param?: string;
  selected: boolean;
  source?: "search_page" | "gym_list" | "equipment_page" | "unknown";
}
```

Example:

```ts
trackEvent("district_filter", {
  district: "wan-chai",
  filter_param: "district",
  selected: true,
  source: "search_page",
});
```

Gymory-specific implementation:

- Track district dropdown changes in the browse-by-district controls.
- Use the district page slug, such as `wan-chai` or `yau-tsim-mong`, where available.
- Fire `selected: false` when the user clears a district and returns to the generic search page.

---

### 9. `search_result_click`

Track when a user clicks a gym from search results or listing results.

Parameters:

```ts
{
  gym_slug: string;
  gym_name?: string;
  search_term?: string;
  result_position?: number;
  source?: "search_results" | "equipment_page" | "district_page" | "brand_page" | "unknown";
}
```

Example:

```ts
trackEvent("search_result_click", {
  gym_slug: gym.slug,
  gym_name: gym.name,
  search_term: query,
  result_position: index + 1,
  source: "search_results",
});
```

Use this when users click from:

- Search results
- Equipment page gym list
- District + equipment page
- Brand page gym list

This helps us understand which results users choose.

Gymory-specific implementation:

- `GymCard` is shared across search, equipment, district, and brand result lists.
- Extend `GymCard` or wrap it so callers can pass `source`, `result_position`, and the current search/filter context.
- For filter-driven result pages, `search_term` may be omitted. Prefer adding params such as `active_filters` or `collection` only if they are short, stable, and not user-entered PII.

---

### 10. `submit_gym_success`

Track successful gym submission or equipment update submission.

Parameters:

```ts
{
  submission_type: "add_gym" | "edit_equipment" | "correction" | "unknown";
  gym_slug?: string;
  locale?: string;
}
```

Example:

```ts
trackEvent("submit_gym_success", {
  submission_type: "edit_equipment",
  gym_slug: gym.slug,
  locale,
});
```

Only fire this after a successful submission, not when the user merely opens the form.

This should eventually become a key conversion event in GA4.

Gymory-specific implementation:

- Match the current submission payload types: `add_gym` for a new gym and `edit_equipment` for an existing gym update.
- Fire after `/api/submissions` returns success and before or alongside the success redirect.
- If the form only has `gymId` and not `gym_slug`, send `gym_id` only if that is acceptable for reporting, or derive the slug from the initial gym data for edit submissions.

---

### 11. `open_google_maps`

Track when a user clicks a Google Maps / directions link.

Parameters:

```ts
{
  gym_slug: string;
  gym_name?: string;
  district?: string;
}
```

Example:

```ts
trackEvent("open_google_maps", {
  gym_slug: gym.slug,
  gym_name: gym.name,
  district: gym.district,
});
```

This is a strong signal that the user found a gym they may actually visit.

Gymory-specific implementation:

- The Google Maps link currently lives on the gym detail page.
- Because the page is server-rendered, wrap the external link in a Client Component or use a small client tracking link component.

---

### 12. `visit_gym_website`

Track when a user clicks the official website or social link of a gym.

Parameters:

```ts
{
  gym_slug: string;
  gym_name?: string;
  link_type: "official_website" | "instagram" | "facebook" | "booking" | "other";
}
```

Example:

```ts
trackEvent("visit_gym_website", {
  gym_slug: gym.slug,
  gym_name: gym.name,
  link_type: "official_website",
});
```

Gymory-specific implementation:

- Current gym detail pages expose official website and Instagram links.
- Use `official_website` for `website_url` and `instagram` for `instagram_url`.
- Do not send the destination URL as a GA4 parameter unless there is a clear reporting need.

---

## Event Priority

Implement these first:

1. `search`
2. `equipment_filter`
3. `gym_brand_filter`
4. `equipment_brand_filter`
5. `district_filter`
6. `search_result_click`
7. `view_gym`
8. `view_equipment`
9. `view_training_collection`
10. `submit_gym_success`

Then implement these if easy:

11. `open_google_maps`
12. `visit_gym_website`

---

## Suggested Type-Safe Wrapper

If practical, create typed event helpers instead of calling `trackEvent` directly everywhere.

Example:

```ts
export function trackSearch(searchTerm: string, source = "unknown") {
  trackEvent("search", {
    search_term: searchTerm,
    source,
  });
}

export function trackEquipmentFilter(params: {
  equipment: string;
  filter_param?: string;
  selected: boolean;
  source?: string;
}) {
  trackEvent("equipment_filter", params);
}

export function trackGymBrandFilter(params: {
  gym_chain: string;
  filter_param?: string;
  selected: boolean;
  source?: string;
}) {
  trackEvent("gym_brand_filter", params);
}

export function trackEquipmentBrandFilter(params: {
  equipment_brand: string;
  filter_param?: string;
  selected: boolean;
  source?: string;
}) {
  trackEvent("equipment_brand_filter", params);
}

export function trackDistrictFilter(params: {
  district: string;
  filter_param?: string;
  selected: boolean;
  source?: string;
}) {
  trackEvent("district_filter", params);
}

export function trackGymView(params: {
  gym_slug: string;
  gym_name?: string;
  district?: string;
  chain?: string;
  locale?: string;
}) {
  trackEvent("view_gym", params);
}
```

This makes future tracking easier and reduces inconsistent event names.

Recommended Gymory wrapper additions:

```ts
export function trackTrainingCollectionView(params: {
  training_collection: string;
  district?: string;
  locale?: string;
}) {
  trackEvent("view_training_collection", params);
}

export function trackResultClick(params: {
  gym_slug: string;
  gym_name?: string;
  result_position?: number;
  source: "search_results" | "equipment_page" | "district_page" | "brand_page" | "unknown";
}) {
  trackEvent("search_result_click", params);
}

export function trackSubmissionSuccess(params: {
  submission_type: "add_gym" | "edit_equipment" | "correction" | "unknown";
  gym_slug?: string;
  locale?: string;
}) {
  trackEvent("submit_gym_success", params);
}
```

For page-view-style custom events, prefer a reusable Client Component:

```tsx
"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function AnalyticsEventOnMount({
  eventName,
  params,
}: {
  eventName: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}) {
  useEffect(() => {
    trackEvent(eventName, params);
  }, [eventName, params]);

  return null;
}
```

When using this pattern, make sure the `params` object is stable enough that the effect does not fire repeatedly during one page view.

For standard GA4 page views in a Next.js App Router app:

- Keep the initial page load handled by the GA4 script.
- Add a small Client Component that listens to `usePathname()` and `useSearchParams()`.
- Skip the first mount to avoid duplicating the initial `page_view`.
- On later client-side route changes, send `page_view` with `page_location`, `page_path`, and `page_title`.

---

## Important Implementation Notes

### Do not track sensitive personal data

Do not send:

- User email
- User name
- Phone number
- Exact address
- Free-text message content
- Any personally identifiable information

Search terms are okay, but avoid sending private form content.

---

### Avoid excessive events

Do not fire events:

- On every keypress
- On every scroll
- On every render
- Multiple times for the same page load unless intentional

For page-level events like `view_gym`, make sure it fires once per page view.

---

### Use consistent naming

Use lowercase snake_case event names:

```txt
search
equipment_filter
gym_brand_filter
equipment_brand_filter
district_filter
search_result_click
view_gym
view_equipment
view_training_collection
submit_gym_success
open_google_maps
visit_gym_website
```

Use lowercase snake_case parameter names:

```txt
gym_slug
search_term
filter_param
filter_value
selected
source
equipment
gym_chain
equipment_brand
district
training_collection
locale
page_location
page_path
page_title
result_position
submission_type
link_type
```

Use stable slugs for values where possible:

```txt
equipment: "ski-erg"
equipment: "hack-squat"
gym_chain: "pure-fitness"
equipment_brand: "eleiko"
district: "wan-chai"
training_collection: "hyrox-official-hong-kong"
submission_type: "add_gym"
submission_type: "edit_equipment"
```

---

## GA4 Reporting After Implementation

After deployment, these events should appear in:

```txt
GA4 → Reports → Engagement → Events
```

Useful analysis examples:

### Search demand

Which equipment or gym terms are users searching for?

```txt
Event: search
Parameter: search_term
```

Only use this for genuine keyword-style searches, not every filter change.

### Equipment demand

Which equipment filters are users actually applying?

```txt
Event: equipment_filter
Parameter: equipment
```

### Gym brand demand

Which gym chains are users filtering by?

```txt
Event: gym_brand_filter
Parameter: gym_chain
```

### Equipment brand demand

Which equipment brands are users filtering by?

```txt
Event: equipment_brand_filter
Parameter: equipment_brand
```

### District demand

Which districts are users selecting?

```txt
Event: district_filter
Parameter: district
```

### Gym demand

Which gyms are users viewing or clicking?

```txt
Event: view_gym
Parameter: gym_slug
```

### Training collection demand

Which training collection pages are users viewing?

```txt
Event: view_training_collection
Parameter: training_collection
```

### Conversion

How many people successfully submit new gym data or updates?

```txt
Event: submit_gym_success
```

This event should be considered for marking as a key event in GA4 later.

---

## GA4 Custom Dimensions

Create event-scoped custom dimensions for any event parameters that need to appear in standard reports or Explore tables:

```txt
equipment → equipment
gym_chain → gym_chain
equipment_brand → equipment_brand
district → district
training_collection → training_collection
filter_param → filter_param
filter_value → filter_value
selected → selected
source → source
locale → locale
gym_slug → gym_slug
submission_type → submission_type
link_type → link_type
```

Descriptions are optional in GA4, but useful examples are:

- `equipment`: Equipment slug selected or viewed by the user.
- `gym_chain`: Gym chain slug selected by the user.
- `equipment_brand`: Equipment brand slug selected by the user.
- `district`: District page slug selected by the user.
- `training_collection`: Training collection page slug viewed by the user.
- `filter_param`: Search filter query parameter used by the user.
- `filter_value`: Numeric search filter value entered by the user.
- `selected`: Whether the filter was selected or removed.
- `source`: Where the event was triggered.
- `locale`: Page locale where the event was triggered.

---

## Acceptance Criteria

- [ ] A reusable GA4 event tracking helper exists.
- [ ] The helper is safe for Next.js SSR and does not crash when `window` is undefined.
- [ ] Page-level custom events are fired from Client Components, not directly from Server Components.
- [ ] `search` event fires when a genuine keyword search is submitted, if such a search UI exists.
- [ ] `equipment_filter` event fires when equipment filters are applied or removed.
- [ ] `gym_brand_filter` event fires when gym chain filters are applied or removed.
- [ ] `equipment_brand_filter` event fires when equipment brand filters are applied or removed.
- [ ] `district_filter` event fires when a district is selected or cleared.
- [ ] Filter-driven browsing does not emit misleading `search` events.
- [ ] `search_result_click` event fires when a user clicks a gym from a result list.
- [ ] Result click tracking includes source and position where the caller can provide them.
- [ ] Client-side navigation emits one `page_view` event without duplicating the initial load page view.
- [ ] `view_gym` event fires once when a gym detail page is viewed.
- [ ] `view_equipment` event fires once when an equipment page is viewed.
- [ ] `view_training_collection` event fires once when a training collection page is viewed.
- [ ] `submit_gym_success` event fires only after a successful submission and uses current submission types such as `add_gym` and `edit_equipment`.
- [ ] No personally identifiable information is sent to GA4.
- [ ] Event names and parameter names use consistent snake_case naming.
- [ ] Events can be seen in GA4 Realtime or DebugView after local/staging testing.

---

## Testing Plan

1. Deploy or run the app locally with GA4 enabled.
2. Open GA4 Realtime or DebugView.
3. Perform these actions:
   - Submit a keyword search if a keyword search box exists
   - Apply an equipment filter such as SkiErg or sled
   - Apply a gym brand filter such as Pure Fitness
   - Apply an equipment brand filter such as Eleiko
   - Apply a district filter such as Wan Chai
   - Apply a numeric filter such as minimum rack count
   - Click a gym result
   - Navigate from `/search` to a training collection page such as `/hyrox-official-hong-kong`
   - Open a gym detail page
   - Open an equipment page such as `/equipment/ski-erg`
   - Open a training collection page such as `/hyrox-official-hong-kong`
   - Click a Google Maps link from a gym detail page
   - Click a website or Instagram link from a gym detail page
   - Submit a test gym update successfully
4. Confirm the events appear in GA4.
5. Confirm event parameters are populated correctly.
6. Confirm no PII is sent.

---

## Future Enhancements

Later, consider adding:

- `login`
- `sign_up`
- `save_gym`
- `share_gym`
- `language_switch`
- `open_equipment_detail`
- Funnel report from search → result click → gym view → map click → submission

These are not required for the first version.
