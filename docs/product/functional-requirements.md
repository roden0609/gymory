# Gymory — Functional Requirements

**Version:** 1.0  
**Last updated:** 2026-05-08  
**Status:** Living document — update as features ship or scope changes

---

## 1. Overview

Gymory is a gym equipment discovery platform. Users can search for gyms in Hong Kong by equipment type, location, and gym size. The core problem it solves is that existing platforms (ClassPass, Google Maps, gym websites) do not expose equipment-level detail, forcing serious gym-goers to visit gyms before knowing if they have what they need.

**Primary users:**
- Strength trainers (powerlifters, bodybuilders)
- HYROX athletes
- Freelance personal trainers
- Travellers and expats looking for a gym

**Core value proposition:** Find gyms with the equipment you need — not just the nearest one.

---

## 2. Current Features (Implemented)

### 2.1 Search & Filtering

**Description:** Users can search for gyms using a combination of district and equipment filters.

**Behaviour:**
- Filters are applied via URL query parameters (e.g. `/search?district=central&rack_count=2`)
- Multiple filters can be combined
- Results update without a full page reload (client-side state managed via URL)
- Results show a list view and a map view toggle

**Available filters:**
- District (Hong Kong districts)
- Minimum rack count
- Minimum dumbbell weight (kg)
- Has assault bike (boolean)
- Has ski erg (boolean)
- Has rower (boolean)
- Has cable machine (boolean)
- Has hack squat (boolean)

**Edge cases:**
- If no gyms match the filters, show an empty state with a prompt to broaden filters or submit a missing gym
- If the database is unreachable, show an error state

---

### 2.2 Gym Detail Page

**Description:** Each gym has a dedicated page at `/gyms/[slug]` showing full equipment detail, location, and contact information.

**Behaviour:**
- Page is server-rendered for SEO
- Slug is derived from the gym name and is unique
- Page includes structured data (JSON-LD, schema.org `ExerciseGym`)
- Page is available in English (`/en/gyms/[slug]`) and Traditional Chinese (`/zh-HK/gyms/[slug]`)

**Content displayed:**
- Gym name (localised if available)
- District and address (localised if available)
- Verified badge (if `is_verified = true`) and verification date
- Last updated date
- Size category and estimated floor area
- Day pass price
- Data source indicator

**Equipment sections:**
- Free weights (racks, benches, barbells, platforms, dumbbell min/max, plate min/max, and boolean features like dip station, pull-up bar, trap bar, etc.)
- Cardio (treadmill, assault bike, exercise bike, climber, elliptical)
- HYROX (assault runner, ski erg, sled, rower, kettlebells by weight, sandbags by weight, wall balls by weight)
- Cable machines
- Full body machines (Smith machine)
- Core, arm, chest, back, shoulder, and leg machines (boolean presence)
- Other equipment (battle rope, TRX, resistance bands, plyo box, rings, etc.)
- Amenities (washroom, bathroom, dry/wet sauna, ice bath)
- Equipment brands

**Additional sections:**
- Opening hours (structured JSON, sorted by day)
- Location block with Google Maps link
- Contact links (website, Instagram, phone)

**Accuracy voting:**
- Users can vote on whether the equipment data is accurate
- Vote state is stored per gym, visible to all users
- Login is required to vote (Firebase Auth)

---

### 2.3 Gym Submission

**Description:** Any user can submit a new gym or suggest an update to an existing gym's equipment data.

**Behaviour:**
- Accessible at `/submit`
- No login required to submit
- Submissions are stored in a `gym_update_submissions` table and are pending admin review before going live
- If accessed via `/submit?gymId=X&returnTo=/gyms/[slug]`, the form is pre-filled as an update suggestion for an existing gym
- After submission, user is redirected with `?flash=submission-success` showing a confirmation banner

**Form fields (new gym submission):**
- Gym name (required)
- District (required)
- Address
- Equipment counts and booleans (same structure as gym detail)
- Notes / additional information

---

### 2.4 Admin Panel

**Description:** Admin-only interface for reviewing submissions, verifying gyms, and managing gym records.

**Access:** Firebase Auth — admin role required. Protected by middleware.

**Features:**
- List all pending submissions
- Approve or reject submissions
- View and edit gym records
- Mark gyms as verified (`is_verified`)
- Delete gym records

---

### 2.5 Internationalisation (i18n)

**Description:** The entire web app supports English and Traditional Chinese (Hong Kong).

**Behaviour:**
- Locale is part of the URL: `/en/...` and `/zh-HK/...`
- Default locale is `en`
- Gym names and addresses are stored in both languages where available (`name_zh`, `address_zh`)
- District labels are localised
- All UI strings are managed via `next-intl`
- Alternate hreflang tags are set on every page for SEO

---

### 2.6 SEO Infrastructure

**Description:** The app is built for organic search discovery.

**Implemented:**
- Server-side rendering for all public pages
- Dynamic `<title>` and `<meta description>` per page
- Open Graph and Twitter card tags
- JSON-LD structured data on gym detail pages (`ExerciseGym` schema)
- `sitemap.xml` — dynamically generated, includes all active gym pages for all locales
- `robots.txt` — allows all public pages, disallows `/admin/` and `/api/`
- Canonical URLs with localised alternates (`x-default` + per-locale)

**Gap (planned — see Section 3.2):**
- No static SEO landing pages for district or equipment combinations
- Search results at `/search?district=X` are not reliably indexed by Google

---

### 2.7 Map View

**Description:** Search results can be viewed on a map using Mapbox.

**Behaviour:**
- Toggle between list view and map view on the search results page
- Gym pins are shown at lat/lng coordinates
- Clicking a pin navigates to the gym detail page

---

## 3. Planned Features

### 3.1 Gym Photos

**Status:** Schema and storage design documented (`docs/product/gym-photos-fr.md`). Not yet implemented in the UI.

**Scope:**
- Gym owners or users can upload photos
- Photos are stored in Supabase Storage
- Photos are displayed on gym detail pages

---

### 3.2 Static SEO Landing Pages

**Priority:** High — directly impacts organic traffic growth.

**Problem:**
The current `/search?district=X&equipment=Y` URL structure is not reliably indexed by Google. Query parameters are treated as dynamic content and are often skipped by crawlers. This means Gymory is missing a large volume of potential organic traffic from searches like "central gym hong kong" or "hyrox training gym hong kong".

**Solution:**
Create static, pre-rendered landing pages for district and equipment combinations.

**Proposed URL structure:**
- `/gyms/[district]` — e.g. `/gyms/central`, `/gyms/mong-kok`
- `/gyms/[equipment-category]` — e.g. `/gyms/hyrox-hong-kong`, `/gyms/powerlifting-gym-hong-kong`
- `/gyms/[district]/[equipment-category]` — e.g. `/gyms/central/hyrox`

**Requirements:**
- Pages are statically generated at build time (`generateStaticParams`)
- Each page has a unique `<title>` and `<meta description>` targeting the relevant keyword
- Each page renders the filtered gym list matching the district or equipment category
- Pages are added to `sitemap.xml`
- Canonical URLs are set correctly to avoid duplicate content issues
- Pages are available in both `en` and `zh-HK`

**Content requirements per landing page:**
- H1 with the target keyword (e.g. "HYROX Gyms in Hong Kong")
- Short editorial paragraph (2–3 sentences) describing what the page is for
- Gym list filtered to relevant results
- Link to the main search page for broader exploration

**Priority landing pages (first batch):**
1. `/gyms/hyrox-hong-kong` — high search intent, niche audience
2. `/gyms/powerlifting-hong-kong`
3. One page per Hong Kong district (18 districts)

---

### 3.3 Gym Owner Claim Flow

**Status:** Not yet built.

**Scope:**
- Gym owners can claim their listing
- Claimed gyms can be edited directly by the owner without admin review
- Claimed gyms display an "Owner managed" indicator

---

### 3.4 User Accounts (Non-Admin)

**Status:** Auth is implemented (Firebase). Non-admin user features are not yet built.

**Planned scope:**
- Save / bookmark gyms
- View submission history
- Required for accuracy voting (already gating this)

---

### 3.5 Personal Trainer Profiles

**Status:** Documented in monetization strategy. Not yet designed or built.

**Scope:**
- PTs can create a profile (name, speciality, districts, contact)
- PT profile cards appear inline in search results (clearly labelled as featured/sponsored)
- Manual review before going live

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Gym detail pages must be server-rendered (not client-side only) for SEO
- Search results should load within 2 seconds under normal conditions
- Map view should not block the initial page render

### 4.2 Data Integrity
- Equipment data changes are logged via submission history
- No direct schema edits to production — all changes via migrations
- Equipment counts can be `null` (not listed) — do not treat `null` as `0`

### 4.3 Localisation
- All user-facing strings must be in `next-intl` translation files
- Hard-coded English strings in UI components are not acceptable
- District labels must use the official localised names

### 4.4 SEO
- Every public page must have a unique `<title>` and `<meta description>`
- Gym detail pages must include JSON-LD structured data
- No public page should return a non-200 status code under normal conditions

### 4.5 Security
- Admin routes are protected by Firebase Auth middleware
- Supabase RLS is enabled — public reads are allowed, writes require auth
- Server-only environment variables must never be exposed to the client

---

## 5. Out of Scope (Current Phase)

- Booking or payment processing
- Reviews or ratings system
- Native mobile app
- Real-time equipment availability
- Advanced recommendation engine
- Multi-city or multi-country expansion
