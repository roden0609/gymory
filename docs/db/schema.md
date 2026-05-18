# Database Schema

## Phase 1 — Single table MVP

**gyms** — one row per gym. See `supabase/migrations/0001_create_gyms.sql`.

### Column strategy
| Type | Used for |
|------|---------|
| `integer count` | Equipment where quantity matters (racks, assault bikes, rowers…) |
| `boolean` | Equipment where "has / doesn't have" is enough (smith machine, TRX…) |
| `boolean` | Other equipment presence columns (has_battle_rope, has_foam_roller, etc.) |
| `boolean` | Amenity presence columns (has_washroom, has_bathroom, has_yoga_block, has_yoga_mat) |
| `boolean` | Source-backed partner flags (is_hyrox_official) |
| `text / timestamptz` | Source trace fields for partner imports (hyrox_partner_id, hyrox_source_url, hyrox_source_synced_at) |
| `numeric` | Weight ranges (dumbbell_max_weight_kg, plate_max_weight_kg) |

### Search query pattern
```sql
select * from gyms
where district_code = 'HK-WC'
  and rack_count >= 2
  and assault_bike_count >= 1
  and dumbbell_max_weight_kg >= 40
  and is_active = true
order by is_verified desc, updated_at desc;
```

## Phase 2 — Inventory tables (future)
- `equipment_types` — taxonomy of all equipment types
- `equipment_brands` — brand dictionary
- `gym_equipment_inventory` — detailed per-item inventory per gym
- `gym_photos`
- `gym_update_submissions`
- `app_users`
- `gym_claims`
