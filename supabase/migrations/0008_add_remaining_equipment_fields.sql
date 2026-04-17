-- Add remaining MVP single-table equipment fields.
-- Presence booleans intentionally coexist with specific weight counts, since a
-- gym may have the item without having the standard competition weights.

alter table public.gyms
  -- Free weight
  add column if not exists has_landmine_attachment boolean not null default false,
  add column if not exists has_swiss_bar boolean not null default false,
  add column if not exists has_cambered_bar boolean not null default false,
  add column if not exists has_ez_bar boolean not null default false,

  -- HYROX / functional
  add column if not exists has_wall_ball boolean not null default false,
  add column if not exists has_sandbag boolean not null default false,
  add column if not exists sandbag_10kg_count integer not null default 0 check (sandbag_10kg_count >= 0),
  add column if not exists sandbag_20kg_count integer not null default 0 check (sandbag_20kg_count >= 0),
  add column if not exists sandbag_30kg_count integer not null default 0 check (sandbag_30kg_count >= 0),
  add column if not exists has_kettlebell boolean not null default false,
  add column if not exists kettlebell_16kg_count integer not null default 0 check (kettlebell_16kg_count >= 0),
  add column if not exists kettlebell_24kg_count integer not null default 0 check (kettlebell_24kg_count >= 0),
  add column if not exists kettlebell_32kg_count integer not null default 0 check (kettlebell_32kg_count >= 0),

  -- Other equipment
  add column if not exists has_battle_rope boolean not null default false,
  add column if not exists has_foam_roller boolean not null default false,
  add column if not exists has_medicine_ball boolean not null default false,
  add column if not exists has_dip_belt boolean not null default false,
  add column if not exists has_weight_vest boolean not null default false,
  add column if not exists has_lifting_straps boolean not null default false,
  add column if not exists has_plyo_box boolean not null default false,
  add column if not exists has_balance_ball boolean not null default false;

update public.gyms
set
  has_landmine_attachment = has_landmine_attachment or ('landmine' = any(equipment_tags)),
  has_swiss_bar = has_swiss_bar or ('swiss_bar' = any(equipment_tags)),
  has_cambered_bar = has_cambered_bar or ('cambered_bar' = any(equipment_tags)),
  has_wall_ball = has_wall_ball
    or wall_ball_count > 0
    or wall_ball_4kg_count > 0
    or wall_ball_6kg_count > 0
    or wall_ball_9kg_count > 0,
  has_kettlebell = has_kettlebell or ('kettlebells' = any(equipment_tags)),
  has_battle_rope = has_battle_rope
    or has_battle_ropes
    or ('battle_ropes' = any(equipment_tags)),
  has_foam_roller = has_foam_roller or ('foam_rollers' = any(equipment_tags)),
  has_medicine_ball = has_medicine_ball or ('medicine_balls' = any(equipment_tags)),
  has_dip_belt = has_dip_belt or ('dip_belt' = any(equipment_tags)),
  has_weight_vest = has_weight_vest or ('weight_vest' = any(equipment_tags)),
  has_lifting_straps = has_lifting_straps or ('lifting_straps' = any(equipment_tags)),
  has_plyo_box = has_plyo_box or ('plyo_boxes' = any(equipment_tags));

create index if not exists idx_gyms_sandbag_20kg_count
  on public.gyms (sandbag_20kg_count);

create index if not exists idx_gyms_kettlebell_24kg_count
  on public.gyms (kettlebell_24kg_count);
