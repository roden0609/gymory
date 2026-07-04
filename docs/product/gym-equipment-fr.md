# Functional Requirements: Gym Equipment Catalog and Inventory

## Overview

Build a professional-user equipment discovery layer for Gymory.

The feature lets Gymory maintain a structured catalog of gym equipment machines from official brand sources, then attach specific machines to individual gyms. Users can search gyms by machine, brand, equipment category, muscle group, or movement pattern.

This is intended for advanced users who care about specific machines, not only general amenities. Examples:

- Find gyms with a hack squat machine
- Find gyms with Hammer Strength plate-loaded equipment
- Find gyms with machines for quads or back
- Find gyms with both squat racks and belt squat
- Find gyms with a specific machine model

The first version should be implemented as a power-user layer without making the normal gym search experience more complicated.

---

## Goals

- Create a reusable equipment machine catalog based on official brand product data.
- Allow admins or trusted contributors to assign known machines to gyms.
- Allow users to filter or search gyms by machine, brand, category, movement pattern, and muscle group.
- Keep uncertain user submissions separate from verified inventory data.
- Support future community submissions, owner verification, and confidence scoring.

---

## Non-Goals

- Do not scrape every fitness equipment brand in the first version.
- Do not require normal users to understand exact machine model names.
- Do not make machine inventory the main gym discovery path for casual users.
- Do not auto-publish user-submitted equipment data without review.
- Do not rely only on free-text machine names for long-term search.

---

## Actors

- **Visitor** — unauthenticated user who can search and view public equipment inventory.
- **User** — authenticated user who may submit suggested machine inventory later.
- **Professional user** — advanced user searching for specific equipment.
- **Gym owner / staff** — future actor who may claim a gym and submit official inventory.
- **Admin** — internal Gymory user who can manage the catalog, import machines, review submissions, and verify inventory.

---

## Product Concept

The feature has two separate data layers:

1. **Equipment Catalog**
   - Canonical list of brands, categories, and machine models.
   - Example: Hammer Strength → Plate Loaded → Iso-Lateral Leg Press.
   - Sourced from official brand websites, admin entry, or curated seed data.

2. **Gym Inventory**
   - Which catalog machines are available at a specific gym.
   - Example: Gym A has Hammer Strength Iso-Lateral Leg Press, quantity 1.
   - May be verified by admin, owner, community, or imported from trusted source.

These layers must remain separate. A brand's official product catalog does not prove that any specific gym has that machine.

---

## MVP Scope

The MVP should include:

- Admin-managed equipment brands.
- Admin-managed equipment categories.
- Admin-managed equipment machines.
- Admin-managed gym-to-machine inventory.
- Public display of verified or admin-approved machines on gym detail pages.
- Search/filter support for machine name, brand, and category.

The MVP may skip:

- User submissions.
- Owner verification.
- Confidence score UI.
- Muscle group and movement pattern filters.
- Automated scraping/import jobs.
- Machine photos.

---

## Recommended Initial Brands

Start with a small set of common or high-signal brands likely to matter in Hong Kong gyms:

- Technogym
- Life Fitness
- Hammer Strength
- Matrix
- Precor
- Rogue
- Eleiko
- Nautilus
- Panatta
- Prime Fitness

This list is intentionally small. Expand only after the import and review workflow is stable.

---

## FR-1: Equipment Brand Catalog

### FR-1.1 Brand records
Admins can create and edit equipment brands.

Each brand should support:

- Name
- Slug
- Official website URL
- Country or origin, optional
- Active/inactive status
- Notes, optional

### FR-1.2 Brand visibility
Only active brands appear in public filters.

### FR-1.3 Brand source tracking
If a brand was added from an official website, store the source URL and synced timestamp where practical.

---

## FR-2: Equipment Categories

### FR-2.1 Category records
Admins can create and edit equipment categories.

Examples:

- Strength
- Plate Loaded
- Selectorized
- Cardio
- Free Weights
- Functional Training
- Recovery

### FR-2.2 Nested categories
Categories may have a parent category.

Example:

- Strength
  - Plate Loaded
  - Selectorized
  - Cable

### FR-2.3 Category visibility
Only active categories appear in public filters.

---

## FR-3: Equipment Machine Catalog

### FR-3.1 Machine records
Admins can create and edit machine records.

Each machine belongs to:

- One brand
- One primary category

Each machine should support:

- Name
- Slug
- Brand
- Category
- Model number, optional
- Product URL, optional
- Image URL, optional
- Description, optional
- Status: `active`, `discontinued`, `unknown`
- Source: `official`, `manual`, `user_submitted`, `import`

### FR-3.2 Canonical machine naming
Use the official product name as the canonical machine name when available.

Examples:

- `Iso-Lateral Leg Press`
- `Pendulum-X Squat`
- `Smith Machine`

### FR-3.3 Search aliases
Machines should support aliases so users can search common terms that differ from official names.

Examples:

- `hack squat`
- `leg press`
- `lat pulldown`
- `belt squat`
- `chest press`

This may be implemented as a separate alias table or a text array depending on the existing database conventions.

### FR-3.4 Duplicate prevention
The same brand should not have duplicate machines with the same slug or normalized name.

### FR-3.5 Official source updates
When importing from official sites, do not overwrite admin-edited fields without a review step unless the field is explicitly source-owned.

---

## FR-4: Optional Taxonomy

This can be added after MVP if search needs richer semantic filters.

### FR-4.1 Muscle groups
Machines may map to one or more muscle groups.

Examples:

- Chest
- Back
- Quads
- Hamstrings
- Glutes
- Shoulders
- Biceps
- Triceps
- Calves
- Core

Each mapping may include a role:

- `primary`
- `secondary`

### FR-4.2 Movement patterns
Machines may map to one or more movement patterns.

Examples:

- Squat
- Hip Hinge
- Horizontal Press
- Vertical Press
- Horizontal Pull
- Vertical Pull
- Knee Flexion
- Knee Extension
- Hip Thrust
- Loaded Carry

### FR-4.3 Search by taxonomy
Users should eventually be able to search by broader intent, such as "quads" or "horizontal press", even if they do not know exact machine names.

---

## FR-5: Gym Equipment Inventory

### FR-5.1 Assign machine to gym
Admins can assign catalog machines to a gym.

Each assignment should support:

- Gym
- Machine
- Quantity, optional
- Condition, optional
- Notes, optional
- Verification status
- Source
- Added by user, optional
- Verified by user, optional
- Verified at timestamp, optional

### FR-5.2 Verification statuses
Supported verification statuses:

- `unverified`
- `community_verified`
- `owner_verified`
- `admin_verified`

### FR-5.3 Inventory sources
Supported inventory sources:

- `admin`
- `owner`
- `user`
- `import`

### FR-5.4 Public visibility
Only inventory records that meet the public visibility rule should appear publicly.

Recommended MVP rule:

- Show `admin_verified` and `owner_verified`
- Hide `unverified`
- Decide later whether to show `community_verified`

### FR-5.5 Quantity handling
Quantity is optional because users may know a gym has a machine but not know the exact count.

If quantity is unknown, public UI should show the machine as present without a count.

### FR-5.6 Condition handling
Condition is optional and should not be required in MVP.

Possible values:

- `good`
- `fair`
- `poor`
- `unknown`

---

## FR-6: User Submissions

This is a post-MVP feature unless implementation is cheap because Gymory already has a submission workflow.

### FR-6.1 Submission form
Authenticated users can suggest machines available at a gym.

The form should allow:

- Brand selection or free-text brand
- Machine selection or free-text machine
- Category, optional
- Quantity, optional
- Notes, optional
- Photo, optional in future

### FR-6.2 Raw submission records
User-submitted machine data must first be stored as a pending submission, not directly inserted into public gym inventory.

### FR-6.3 Admin matching
Admins can match a raw submission to an existing catalog machine or create a new catalog machine if necessary.

### FR-6.4 Submission statuses
Supported statuses:

- `pending`
- `accepted`
- `rejected`
- `merged`

### FR-6.5 Public confirmation
After submission, the user sees a confirmation that the equipment suggestion is under review.

---

## FR-7: Public Gym Detail Display

### FR-7.1 Equipment section
Gym detail pages should show a machine inventory section when the gym has verified machines.

Recommended grouping:

- By category
- Within each category, group or label by brand

Example:

- Plate Loaded
  - Hammer Strength Iso-Lateral Leg Press
  - Panatta Hack Squat
- Cardio
  - Concept2 RowErg

### FR-7.2 Empty state
If a gym has no verified machine inventory, hide the section or show a subtle prompt to submit equipment information.

### FR-7.3 Compact display
Do not make the gym detail page visually heavy. This is power-user information and should sit below key gym details.

---

## FR-8: Search and Filters

### FR-8.1 Machine search
Users can search gyms by machine name or alias.

Examples:

- `hack squat`
- `belt squat`
- `lat pulldown`
- `leg press`

### FR-8.2 Brand filter
Users can filter gyms by equipment brand.

Example:

- Show gyms with at least one Hammer Strength machine.

### FR-8.3 Category filter
Users can filter gyms by equipment category.

Example:

- Show gyms with plate-loaded machines.

### FR-8.4 Combined filters
Users can combine machine filters with existing location and gym filters.

Example:

- District: Central and Western
- Machine: Hack Squat
- Brand: Hammer Strength

### FR-8.5 Result matching
A gym matches a machine filter if it has at least one publicly visible inventory record linked to a matching machine.

### FR-8.6 Future taxonomy filters
After muscle groups and movement patterns are added, users can filter by:

- Muscle group
- Movement pattern
- Training goal

---

## FR-9: Admin Workflow

### FR-9.1 Catalog management
Admins can manage:

- Brands
- Categories
- Machines
- Aliases
- Optional taxonomy

### FR-9.2 Gym inventory management
Admins can open a gym record and add or remove machines.

### FR-9.3 Review pending submissions
Admins can review user-submitted equipment suggestions if FR-6 is implemented.

### FR-9.4 Import review
If machine import scripts are added, admins should be able to review new or changed machines before public use.

---

## FR-10: Official Website Import

### FR-10.1 Import source
Machine catalog imports should prefer official brand websites.

Examples:

- Brand product pages
- Product category pages
- Official product JSON or APIs where available

### FR-10.2 Respect source constraints
Importers should respect robots.txt, rate limits, and website terms.

### FR-10.3 Store source metadata
Imported machines should store:

- Source URL
- Source type
- Imported at timestamp
- Last seen at timestamp where practical

### FR-10.4 Do not infer gym inventory
Official brand product data must only populate the equipment catalog. It must not imply that any gym owns the machine.

---

## Recommended Data Model

### `equipment_brands` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `name` | text | required |
| `slug` | text | unique, required |
| `website_url` | text | nullable |
| `country` | text | nullable |
| `is_active` | boolean | default true |
| `notes` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `equipment_categories` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `parent_id` | uuid | nullable foreign key to `equipment_categories.id` |
| `name` | text | required |
| `slug` | text | unique, required |
| `sort_order` | integer | default 0 |
| `is_active` | boolean | default true |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `equipment_machines` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `brand_id` | uuid | foreign key to `equipment_brands.id` |
| `category_id` | uuid | foreign key to `equipment_categories.id` |
| `name` | text | required |
| `slug` | text | required |
| `model_number` | text | nullable |
| `product_url` | text | nullable |
| `image_url` | text | nullable |
| `description` | text | nullable |
| `status` | text | `active`, `discontinued`, `unknown` |
| `source` | text | `official`, `manual`, `user_submitted`, `import` |
| `source_url` | text | nullable |
| `source_synced_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Recommended unique constraint:

- `(brand_id, slug)`

### `equipment_machine_aliases` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `machine_id` | uuid | foreign key to `equipment_machines.id` |
| `alias` | text | required |
| `locale` | text | nullable, e.g. `en`, `zh-HK` |
| `created_at` | timestamptz | |

### `gym_equipment` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `gym_id` | uuid | foreign key to `gyms.id` |
| `machine_id` | uuid | foreign key to `equipment_machines.id` |
| `quantity` | integer | nullable |
| `condition` | text | `good`, `fair`, `poor`, `unknown`; nullable |
| `notes` | text | nullable |
| `verified_status` | text | `unverified`, `community_verified`, `owner_verified`, `admin_verified` |
| `confidence_score` | integer | nullable, 0-100 |
| `source` | text | `admin`, `owner`, `user`, `import` |
| `added_by_user_id` | uuid | nullable |
| `verified_by_user_id` | uuid | nullable |
| `verified_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Recommended unique constraint:

- `(gym_id, machine_id)`

### `gym_equipment_submissions` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `gym_id` | uuid | foreign key to `gyms.id` |
| `submitted_by_user_id` | uuid | nullable if anonymous submissions are ever allowed |
| `brand_text` | text | nullable |
| `machine_text` | text | required if no `matched_machine_id` |
| `category_text` | text | nullable |
| `quantity` | integer | nullable |
| `notes` | text | nullable |
| `photo_url` | text | nullable, future |
| `matched_machine_id` | uuid | nullable foreign key to `equipment_machines.id` |
| `status` | text | `pending`, `accepted`, `rejected`, `merged` |
| `admin_notes` | text | nullable |
| `created_at` | timestamptz | |
| `reviewed_at` | timestamptz | nullable |

### Optional future tables

#### `muscle_groups`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `name` | text | required |
| `slug` | text | unique, required |

#### `movement_patterns`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `name` | text | required |
| `slug` | text | unique, required |

#### `equipment_machine_muscles`
| Column | Type | Notes |
|---|---|---|
| `machine_id` | uuid | foreign key to `equipment_machines.id` |
| `muscle_group_id` | uuid | foreign key to `muscle_groups.id` |
| `role` | text | `primary`, `secondary` |

#### `equipment_machine_movements`
| Column | Type | Notes |
|---|---|---|
| `machine_id` | uuid | foreign key to `equipment_machines.id` |
| `movement_pattern_id` | uuid | foreign key to `movement_patterns.id` |

---

## Suggested Query Patterns

### Find gyms with a specific machine slug
```sql
select g.*
from gyms g
join gym_equipment ge on ge.gym_id = g.id
join equipment_machines em on em.id = ge.machine_id
where g.is_active = true
  and ge.verified_status in ('admin_verified', 'owner_verified')
  and em.slug = 'hack-squat';
```

### Find gyms with any machine from a brand
```sql
select distinct g.*
from gyms g
join gym_equipment ge on ge.gym_id = g.id
join equipment_machines em on em.id = ge.machine_id
join equipment_brands eb on eb.id = em.brand_id
where g.is_active = true
  and ge.verified_status in ('admin_verified', 'owner_verified')
  and eb.slug = 'hammer-strength';
```

### Find gyms by machine alias
```sql
select distinct g.*
from gyms g
join gym_equipment ge on ge.gym_id = g.id
join equipment_machines em on em.id = ge.machine_id
left join equipment_machine_aliases ema on ema.machine_id = em.id
where g.is_active = true
  and ge.verified_status in ('admin_verified', 'owner_verified')
  and (
    em.name ilike '%hack squat%'
    or ema.alias ilike '%hack squat%'
  );
```

---

## Migration Strategy

### Phase 1: Admin-only MVP
- Add `equipment_brands`.
- Add `equipment_categories`.
- Add `equipment_machines`.
- Add `equipment_machine_aliases`.
- Add `gym_equipment`.
- Seed a small brand/category/machine catalog manually.
- Add admin inventory editing.
- Add public gym detail display.
- Add search filters for brand and machine.

### Phase 2: Better Search Taxonomy
- Add muscle groups.
- Add movement patterns.
- Map common machines to muscles and movement patterns.
- Add filters for muscle group and movement pattern.

### Phase 3: Community and Owner Data
- Add `gym_equipment_submissions`.
- Add user submission UI.
- Add admin review/matching UI.
- Add owner-verified inventory support.
- Add confidence score where useful.

### Phase 4: Official Site Imports
- Add importer scripts for selected official brand websites.
- Store source metadata.
- Add import review process.
- Add periodic refresh only after review workflow is reliable.

---

## UX Notes

- Keep equipment search available but not visually dominant for casual users.
- Prefer an advanced filter section or equipment-specific search entry point.
- Users should not need to know exact official model names.
- Search should work with common names and aliases.
- Gym detail pages should show machine inventory compactly, grouped by category and brand.
- Verification status should be visible where it builds trust, but not make the UI noisy.

---

## Analytics Notes

If GA4 custom events are implemented, track:

- `equipment_filter`
- `brand_filter`
- `machine_search`
- `view_gym_equipment`
- `submit_gym_equipment`

Do not send user notes, free-text private data, email, phone number, or personally identifiable information to analytics.

---

## Open Questions

- Should unverified community inventory ever be shown publicly with a warning?
- Should machine photos be attached to catalog machines, gym inventory records, or user submissions?
- Should gym owners be allowed to bulk upload machine lists?
- Should some existing `gyms` boolean/count equipment columns be migrated into `gym_equipment`, or should both systems run in parallel?
- Should equipment search live inside `/search`, a dedicated `/equipment` page, or both?

