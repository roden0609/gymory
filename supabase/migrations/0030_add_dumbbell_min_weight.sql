alter table public.gyms
  add column if not exists dumbbell_min_weight_kg numeric
    check (dumbbell_min_weight_kg is null or dumbbell_min_weight_kg > 0);
