-- Indexes for common search patterns
-- Run after 0001_create_gyms.sql

-- Most common filter: district
create index if not exists idx_gyms_district on gyms (district);

-- Active gyms filter
create index if not exists idx_gyms_is_active on gyms (is_active);

-- Map queries: bounding box
create index if not exists idx_gyms_lat_lng on gyms (lat, lng);

-- Equipment filters
create index if not exists idx_gyms_rack_count on gyms (rack_count);
create index if not exists idx_gyms_assault_bike_count on gyms (assault_bike_count);
create index if not exists idx_gyms_ski_erg_count on gyms (ski_erg_count);
create index if not exists idx_gyms_rower_count on gyms (rower_count);
create index if not exists idx_gyms_dumbbell_max_weight on gyms (dumbbell_max_weight_kg);
create index if not exists idx_gyms_size_sqft on gyms (estimated_size_sqft);

-- Gym detail lookup by slug
create index if not exists idx_gyms_slug on gyms (slug);

-- GIN index for equipment_tags array search
create index if not exists idx_gyms_equipment_tags on gyms using gin (equipment_tags);
