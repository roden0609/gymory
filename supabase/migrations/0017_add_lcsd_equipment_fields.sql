-- Add additional equipment fields used by LCSD normalization/import mapping.
-- Keep nullable semantics:
--   count columns: NULL = unknown, integer >= 0 = known count
--   boolean columns: NULL = unknown, true/false = explicit value

alter table public.gyms
  add column if not exists has_multi_press_machine boolean,
  add column if not exists has_multi_hip_machine boolean,
  add column if not exists has_stretching_machine boolean,
  add column if not exists has_elliptical_machine boolean,
  add column if not exists has_mobility_stick boolean,

  add column if not exists ab_crunch_bench_count integer
    check (ab_crunch_bench_count is null or ab_crunch_bench_count >= 0),
  add column if not exists preacher_curl_bench_count integer
    check (preacher_curl_bench_count is null or preacher_curl_bench_count >= 0),
  add column if not exists overhead_press_chair_count integer
    check (overhead_press_chair_count is null or overhead_press_chair_count >= 0),

  add column if not exists wall_ball_10kg_count integer
    check (wall_ball_10kg_count is null or wall_ball_10kg_count >= 0),

  add column if not exists sandbag_5kg_count integer
    check (sandbag_5kg_count is null or sandbag_5kg_count >= 0),
  add column if not exists sandbag_15kg_count integer
    check (sandbag_15kg_count is null or sandbag_15kg_count >= 0),
  add column if not exists sandbag_25kg_count integer
    check (sandbag_25kg_count is null or sandbag_25kg_count >= 0),

  add column if not exists kettlebell_4kg_count integer
    check (kettlebell_4kg_count is null or kettlebell_4kg_count >= 0),
  add column if not exists kettlebell_6kg_count integer
    check (kettlebell_6kg_count is null or kettlebell_6kg_count >= 0),
  add column if not exists kettlebell_8kg_count integer
    check (kettlebell_8kg_count is null or kettlebell_8kg_count >= 0),
  add column if not exists kettlebell_10kg_count integer
    check (kettlebell_10kg_count is null or kettlebell_10kg_count >= 0),
  add column if not exists kettlebell_12kg_count integer
    check (kettlebell_12kg_count is null or kettlebell_12kg_count >= 0),
  add column if not exists kettlebell_14kg_count integer
    check (kettlebell_14kg_count is null or kettlebell_14kg_count >= 0),
  add column if not exists kettlebell_18kg_count integer
    check (kettlebell_18kg_count is null or kettlebell_18kg_count >= 0),
  add column if not exists kettlebell_20kg_count integer
    check (kettlebell_20kg_count is null or kettlebell_20kg_count >= 0);
