# Database Schema

## Phase 1 — Single table MVP

**gyms** — one row per gym. See `supabase/migrations/0001_create_gyms.sql`.

### Column strategy
| Type | Used for |
|------|---------|
| `integer count` | Equipment where quantity matters (racks, assault bikes, rowers…) |
| `boolean` | Equipment where "has / doesn't have" is enough (smith machine, TRX…) |
| `text[]` equipment_tags | Niche accessories that don't warrant their own column (trap bar, etc.) |
| `numeric` | Weight ranges (dumbbell_max_weight_kg, plate_max_weight_kg) |

### Search query pattern
```sql
select * from gyms
where district = 'Tanjong Pagar'
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
