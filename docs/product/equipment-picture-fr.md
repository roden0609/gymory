# Functional Requirements: Equipment Pictures

## Overview

Add equipment pictures to Gymory so users can understand gym equipment faster on gym detail pages.

The first version should use a reusable equipment catalog image for each equipment type or machine. This means a "Leg Press" or "Squat Rack" can show a representative image wherever it appears, without requiring each gym to upload its own photo.

This feature should make equipment sections more scannable for casual users and more useful for professional users who care about specific machines.

---

## Goals

- Show a small picture beside equipment items on gym detail pages when an image is available.
- Help users recognize equipment without needing to know exact machine names.
- Create a reusable image field for equipment catalog records.
- Keep gym pages visually richer without turning them into a photo gallery.
- Support future brand/model-specific machine images and gym-specific equipment photos.

---

## Non-Goals

- Do not require every equipment item to have an image before launch.
- Do not upload gym-specific equipment photos in the MVP.
- Do not use copyrighted brand product images unless Gymory has permission or the source license allows it.
- Do not make equipment images the primary content of the gym page.
- Do not add complex image moderation in the MVP.

---

## Actors

- **Visitor** — unauthenticated user who views gym detail pages.
- **User** — authenticated user who may later submit gym-specific equipment photos.
- **Admin** — internal Gymory user who uploads or manages equipment catalog pictures.
- **Professional user** — advanced user who uses images to confirm equipment type or machine family.

---

## Product Concept

There are two possible image layers:

1. **Equipment catalog image**
   - A representative image for an equipment type or catalog machine.
   - Example: the "Leg Press" equipment item has one standard image.
   - Used across all gyms that list that equipment.
   - This is the MVP.

2. **Gym-specific equipment photo**
   - A real photo of a specific machine inside a specific gym.
   - Example: a user uploads the actual leg press at Gym A.
   - More trustworthy, but requires upload, moderation, storage, and ownership rules.
   - This is future scope.

The MVP should only implement catalog images. It should not imply that the photo is the exact machine inside that gym unless the image is gym-specific.

---

## MVP Scope

The MVP should include:

- Admin-managed image for each existing equipment definition or equipment catalog item.
- Public display of the image on gym detail equipment sections.
- Placeholder or no-image state for equipment without images.
- Image alt text for accessibility and SEO.
- Mobile-safe thumbnail layout.

The MVP may skip:

- User-submitted equipment photos.
- Gym-specific equipment photo moderation.
- Multiple images per equipment item.
- Image zoom or lightbox.
- Brand/model-specific product images if the current equipment data is still category-level.

---

## FR-1: Equipment Image Data

### FR-1.1 Image field
Each equipment item may have one optional image.

The image may be stored as:

- `image_url` if using an external or public storage URL
- `image_path` if using app-managed storage
- or equivalent field names that match the existing database conventions

### FR-1.2 Image attribution
If an image comes from a third-party source, store attribution where required.

Recommended optional fields:

- `image_source_url`
- `image_source_name`
- `image_license`

### FR-1.3 Alt text
Each equipment image should support alt text.

Default alt text may be generated from the equipment display name:

```text
{Equipment name}
```

Examples:

- `Leg Press`
- `Squat Rack`
- `Cable Machine`

### FR-1.4 Missing image
If an equipment item has no image, the UI should either:

- hide the thumbnail area and keep the current text-only layout, or
- show a neutral placeholder icon

The MVP should prefer hiding the thumbnail area unless the design needs stable alignment.

---

## FR-2: Admin Management

### FR-2.1 Admin upload
Admins can add or replace an equipment image.

### FR-2.2 File constraints

- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: 2 MB per image
- Recommended aspect ratio: 1:1 or 4:3

### FR-2.3 Image processing
Uploaded images should be resized or served responsively so the gym page does not download full-size images for small thumbnails.

### FR-2.4 Replace behavior
When an admin replaces an image, the public gym page should use the latest image.

### FR-2.5 Delete behavior
Admins can remove an equipment image without deleting the equipment item.

---

## FR-3: Gym Detail Page Display

### FR-3.1 Equipment section thumbnails
On the gym detail page, equipment items show a small thumbnail when an image is available.

Recommended layout:

- Thumbnail on the left
- Equipment name and details on the right
- Quantity, notes, or verification metadata remain readable

### FR-3.2 Thumbnail size
Use a compact fixed thumbnail size so equipment rows do not become visually heavy.

Recommended size:

- Mobile: 48x48 or 56x56 px
- Desktop: 56x56 or 64x64 px

### FR-3.3 Responsive layout
The layout must not cause horizontal scrolling on mobile.

Requirements:

- Images must have fixed dimensions or a stable aspect ratio.
- Text must wrap inside the available width.
- Long equipment names must not overflow their container.
- Test at 320px and 375px viewport widths.

### FR-3.4 Visual priority
Equipment images should support scanning, not dominate the page.

Avoid:

- Large card galleries
- Full-width equipment images
- Decorative image treatment
- Nested cards inside equipment cards

### FR-3.5 Exactness disclaimer
If the UI uses catalog images rather than gym-specific photos, it should not present the image as proof of the exact machine at that gym.

Optional helper copy:

```text
Representative equipment image
```

This copy should be subtle and not repeated excessively on every item if it makes the page noisy.

---

## FR-4: Image Source Policy

### FR-4.1 Preferred sources
Preferred image sources:

- Gymory-created images
- Licensed stock or product-like images
- User-submitted images after future approval workflow
- Official brand images only when permission or license allows

### FR-4.2 Avoid unsafe reuse
Do not hotlink official brand product images directly from brand websites.

Do not copy official brand images into Gymory storage unless license or permission is clear.

### FR-4.3 Generated images
Generated or illustrated images may be used for generic equipment categories if they are accurate enough and do not mislead users.

Generated images should avoid visible brand logos unless Gymory has permission.

---

## FR-5: Data Model

The exact implementation depends on the existing equipment data structure. The preferred MVP is to add image fields to the canonical equipment record.

### Option A: Add fields to existing equipment table

Use this if equipment items already live in a single canonical table.

| Column | Type | Notes |
|---|---|---|
| `image_url` | text | nullable public image URL |
| `image_alt` | text | nullable; fallback to equipment name |
| `image_source_url` | text | nullable |
| `image_source_name` | text | nullable |
| `image_license` | text | nullable |
| `image_updated_at` | timestamptz | nullable |

### Option B: New `equipment_images` table

Use this if the app needs multiple image sources later or wants a clearer audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `equipment_id` | uuid | foreign key to equipment item |
| `image_url` | text | public image URL |
| `alt_text` | text | nullable |
| `source_url` | text | nullable |
| `source_name` | text | nullable |
| `license` | text | nullable |
| `status` | text | `active`, `inactive` |
| `created_by_user_id` | uuid | nullable admin user |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

For MVP, Option A is simpler unless the current schema already favors separate media tables.

---

## FR-6: Search and Listing Pages

### FR-6.1 Search results
Do not add equipment thumbnails to the main search result cards in the MVP. Search result cards are already dense and should stay focused on gym-level information.

### FR-6.2 Equipment pages
If equipment-specific pages exist, they may show the equipment image near the page title.

### FR-6.3 Training collection pages
Training collection pages should not show equipment pictures in the MVP unless the page has a dedicated equipment summary section.

---

## FR-7: Performance

### FR-7.1 Optimized loading
Use the app's existing image optimization pattern where available.

Requirements:

- Serve appropriately sized thumbnails.
- Use lazy loading for images below the fold.
- Avoid layout shift by reserving image dimensions.

### FR-7.2 Page weight
The first version should keep total image payload low on gym detail pages.

If a gym has many equipment items, consider:

- showing thumbnails only for highlighted equipment
- lazy loading all equipment images
- limiting images to verified or high-signal equipment

---

## FR-8: Analytics

Track basic usage only if existing GA4 event conventions make this easy.

Possible events:

- `equipment_image_view`
- `equipment_image_click`

For MVP, passive image display does not need a custom event. Add click tracking only if images open a detail view later.

---

## Acceptance Criteria

- Gym detail pages show equipment thumbnails when image data exists.
- Equipment items without images still render cleanly.
- Mobile gym detail pages do not horizontally scroll at 320px or 375px.
- Images have stable dimensions and useful alt text.
- Typecheck and lint pass.
- No copyrighted brand images are added without clear permission or license.

---

## Out of Scope

- Gym-specific equipment photo uploads
- User photo submissions
- Admin moderation for user-submitted equipment pictures
- Multiple images per equipment item
- Image lightbox
- Brand/model photo matching automation
- AI image recognition of equipment from gym photos
