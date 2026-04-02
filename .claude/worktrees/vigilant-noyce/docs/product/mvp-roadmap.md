# MVP Roadmap

## Goal

Launch the first production version of Gymory as fast as possible with the minimum useful feature set:

- users can search gyms
- users can filter by key equipment
- users can view gym details
- users can submit new gyms or suggest updates

This MVP is not meant to be perfect. Its purpose is to validate demand, collect real gym data, and establish a working search experience.

---

## Target Launch Timeline

**Target: 2–3 weeks**  
**Maximum: 4 weeks**

If the product is still not live after 4 weeks, the scope is likely too big.

---

## MVP Scope

### In scope
- Search gyms by district / area
- Filter by key equipment
- View gym detail page
- Submit a gym / suggest equipment updates
- Basic mobile-friendly UI
- Basic SEO for search and gym detail pages
- Deploy to production

### Out of scope
- Booking / payment
- Social features
- Reviews / comments
- Full equipment brand catalog
- Advanced analytics
- Complex moderation workflow
- Native mobile app

---

## Phase 0 — Project Setup

### Timeline
Day 0–2

### Goal
Set up the monorepo and deployment foundation so feature work can begin immediately.

### Tasks
- Create monorepo structure
- Set up Next.js app in `apps/web`
- Set up shared package in `packages/shared`
- Set up Supabase project
- Add initial environment variables
- Configure Vercel deployment
- Create base layout and landing page
- Confirm database connection works

### Deliverables
- app is deployable
- homepage is online
- Supabase connection is working

### Exit criteria
- `pnpm dev` works
- `pnpm build` works
- production preview is accessible

---

## Phase 1 — Core Search

### Timeline
Day 3–7

### Goal
Users can search and filter gyms.

### Tasks
- Create `gyms` table
- Add indexes for common filters
- Seed a small dataset
- Implement `/api/search`
- Add search page UI
- Add filter UI:
  - district
  - min dumbbell weight
  - min rack count
  - has assault bike
  - has ski erg
  - has rower
  - has cable machine
  - has hack squat
- Build results list

### Deliverables
- search endpoint
- search page
- results list page

### Exit criteria
A user can:
- search gyms
- apply filters
- view matching results

---

## Phase 2 — Gym Detail Page

### Timeline
Day 8–12

### Goal
Users can decide whether a gym fits their training needs.

### Tasks
- Create gym detail route: `/gyms/[slug]`
- Show:
  - gym name
  - address
  - district
  - key equipment summary
  - counts
  - equipment tags
  - notes
  - last verified date
- Add map or location block
- Add related equipment highlights
- Add structured metadata for SEO

### Deliverables
- gym detail page
- equipment summary display
- route-based SEO page

### Exit criteria
A user can:
- open a gym page
- quickly understand what equipment is available
- decide whether the gym is suitable

---

## Phase 3 — Data Submission

### Timeline
Day 13–17

### Goal
Enable basic data collection and reduce cold-start risk.

### Tasks
- Build submit page: `/submit`
- Add form for:
  - gym name
  - address
  - district
  - equipment counts
  - equipment tags
  - notes
- Store submissions in database
- Add basic success / error states
- Add lightweight admin review page or temporary manual review process

### Deliverables
- submit gym form
- update suggestion form
- stored submission records

### Exit criteria
A user can:
- submit a new gym
- suggest equipment updates
- complete the flow without needing support

---

## Phase 4 — Polish and Production Launch

### Timeline
Day 18–21

### Goal
Stabilize the MVP and launch to production.

### Tasks
- Improve mobile layout
- Add loading states
- Add empty states
- Add error handling
- Add metadata / titles / descriptions
- Add sitemap and robots
- QA search flow
- QA gym detail page
- QA submit flow
- Clean up obvious UI issues
- Final production deploy

### Deliverables
- production-ready MVP
- working SEO pages
- stable deployment

### Exit criteria
The product is live and usable in production.

---

## Production Launch Checklist

### Product
- [ ] search works
- [ ] filters work
- [ ] gym detail pages work
- [ ] submit flow works

### Data
- [ ] at least 20–50 gyms seeded
- [ ] sample districts covered
- [ ] key equipment fields populated

### Technical
- [ ] env vars configured
- [ ] build passes
- [ ] no blocking console/server errors
- [ ] database schema committed
- [ ] deployment working

### UX
- [ ] mobile layout acceptable
- [ ] loading states present
- [ ] empty states present
- [ ] no broken links

### SEO
- [ ] homepage title and description
- [ ] gym detail metadata
- [ ] sitemap enabled
- [ ] robots enabled

---

## MVP Success Criteria

The MVP is successful if users can do these 3 things:

1. Find gyms  
2. Understand whether the gym has the right equipment  
3. Submit missing or updated gym information  

If all 3 are working, the MVP is ready to launch.

---

## Recommended Feature Priority

### P0 — must have
- search page
- search API
- gym detail page
- gyms table
- submit form
- production deploy

### P1 — should have
- mobile polish
- SEO metadata
- seed data improvements
- admin review support

### P2 — can wait
- login
- saved gyms
- ratings
- featured gyms
- monetization

---

## What NOT to Build Before Launch

Do not delay launch for:
- full brand/model-level equipment catalog
- social/community features
- reviews system
- complex admin workflows
- map clustering polish
- native app
- advanced recommendation engine

---

## Post-Launch Roadmap

### Month 1
- improve data coverage
- improve search quality
- add more gyms manually
- refine equipment filters

### Month 2
- add authentication
- add saved gyms
- add basic trust / verification indicators

### Month 3
- add featured gym monetization
- add gym owner claim flow
- expand equipment taxonomy

---

## Summary

This MVP should be treated as:

**a gym equipment search tool + data collection engine**

The priority is not completeness.  
The priority is to launch fast, collect data, and learn from real usage.