# Functional Requirements: Gym Photos

## Overview

Allow users to submit photos of a gym's facilities and equipment. Submitted photos go through admin review before being publicly visible. This feature follows the same submission-first, admin-approved model used for gym data updates.

---

## Actors

- **User** — authenticated user (Firebase session required) who can submit gym photos
- **Admin** — authenticated user with admin role (`role === "admin"` or `admin === true` in Firebase token) who can review and approve or reject submissions

---

## FR-1: Photo Submission

### FR-1.1 Entry point
A "Add Photos" button or section is available on the gym detail page (`/gyms/[slug]`), alongside the existing "Suggest Update" button.

### FR-1.2 Upload UI
The submission form accepts between 1 and 5 photos per submission.

### FR-1.3 File constraints
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: 5 MB per photo
- The client enforces these constraints before upload; the server re-validates on receipt

### FR-1.4 Optional caption
Each photo may include an optional caption (max 200 characters) describing what is shown (e.g. "Power rack area", "Cardio floor").

### FR-1.5 Login required
Photo submissions require a logged-in user, consistent with the existing gym data submission flow (`/api/submissions` returns 401 for unauthenticated requests). Unauthenticated users are redirected to the login page with a `next` redirect back to the submission form.

### FR-1.6 Storage location
Photos are uploaded to a private or access-controlled storage path (e.g. `pending/{gymId}/{submissionId}/`) before admin approval. They are not publicly accessible at this stage.

### FR-1.7 Submission record
A `gym_update_submissions` record is created with:
- `submission_type = 'upload_photo'`
- `status = 'pending'`
- `payload` containing storage paths and captions for each photo

### FR-1.8 Confirmation
After submission, the user sees a confirmation message indicating the photos are under review, consistent with the existing flash banner pattern.

---

## FR-2: Admin Review

### FR-2.1 Visibility in admin panel
Pending photo submissions appear in the admin submissions review page (`/admin/submissions`) alongside other submission types.

### FR-2.2 Photo preview
The admin can preview each submitted photo before making a decision. Photos are loaded from the private storage path using a server-side signed URL.

### FR-2.3 Caption display
The admin sees any captions submitted alongside each photo.

### FR-2.4 Approve action
When the admin approves a photo submission:
1. Each photo is moved (or its access policy updated) from the pending path to a public path (e.g. `public/{gymId}/{photoId}/`)
2. A record is created in a `gym_photos` table linking the photo to the gym
3. The submission status is updated to `approved`

### FR-2.5 Reject action
When the admin rejects a photo submission:
1. The photos remain in (or are deleted from) the pending storage path — they are never made public
2. The submission status is updated to `rejected`
3. An optional review note may be recorded

### FR-2.6 Partial approval
The admin may approve individual photos from a multi-photo submission rather than approving all or none.

---

## FR-3: Public Display

### FR-3.1 Photo section on gym detail page
Approved photos are displayed in a dedicated section on the gym detail page, below the key stats and above the equipment sections (or at the bottom — TBD by design).

### FR-3.2 Display limit
A maximum of 10 photos are shown per gym. If more than 10 approved photos exist, the most recently approved photos are shown.

### FR-3.3 Caption display
Captions are shown below each photo if present.

### FR-3.4 Lightbox
Clicking a photo opens a lightbox (full-screen overlay) for a larger view. Navigation between photos is supported within the lightbox.

### FR-3.5 No photos state
If a gym has no approved photos, the photo section is hidden or shows a prompt to submit photos.

---

## FR-4: Data Model

### `gym_photos` table (new)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `gym_id` | uuid | foreign key → gyms |
| `submission_id` | uuid | foreign key → gym_update_submissions |
| `storage_path` | text | public storage path |
| `caption` | text | nullable |
| `approved_by_user_id` | uuid | admin user who approved |
| `approved_at` | timestamptz | |
| `created_at` | timestamptz | |

### `gym_update_submissions` payload for `upload_photo`
```json
{
  "photos": [
    {
      "pendingStoragePath": "pending/{gymId}/{submissionId}/photo_0.jpg",
      "caption": "Power rack area"
    }
  ]
}
```

---

## FR-5: Storage Policy

### FR-5.1 Pending bucket/folder
Photos uploaded before approval are stored in a path or bucket that is not publicly readable. Access requires a signed URL generated server-side.

### FR-5.2 Public bucket/folder
Approved photos are accessible via a stable public URL. The path should be stable so URLs remain valid after approval.

### FR-5.3 Cleanup
Rejected or orphaned pending photos should be deleted from storage. This may be handled synchronously on rejection or via a periodic cleanup job.

---

## FR-6: Constraints and Limits

| Constraint | Value |
|---|---|
| Max photos per submission | 5 |
| Max photos displayed per gym | 10 |
| Max file size | 5 MB |
| Accepted formats | JPEG, PNG, WebP |
| Max caption length | 200 characters |
| Login required | No |

---

## Out of Scope

- User-managed photo deletion (requires auth and ownership model)
- Automatic image moderation or AI content filtering
- Image resizing, compression, or CDN optimisation (can be added later)
- Photo ordering by gym owners
- Photo reporting by users
