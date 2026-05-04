alter table public.gyms
  add column if not exists has_ab_crunch_bench boolean,
  add column if not exists has_preacher_curl_bench boolean,
  add column if not exists has_overhead_chair boolean;

update public.gyms
set
  has_ab_crunch_bench = case
    when ab_crunch_bench_count > 0 then true
    when ab_crunch_bench_count = 0 then false
    else null
  end,
  has_preacher_curl_bench = case
    when preacher_curl_bench_count > 0 then true
    when preacher_curl_bench_count = 0 then false
    else null
  end,
  has_overhead_chair = case
    when overhead_press_chair_count > 0 then true
    when overhead_press_chair_count = 0 then false
    else null
  end
where
  has_ab_crunch_bench is null
  or has_preacher_curl_bench is null
  or has_overhead_chair is null;

alter table public.gyms
  drop column if exists ab_crunch_bench_count,
  drop column if exists preacher_curl_bench_count,
  drop column if exists overhead_press_chair_count;
