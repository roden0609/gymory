-- Add bilingual gym fields and normalize location columns to stable codes.

alter table public.gyms
  add column if not exists name_zh text,
  add column if not exists address_zh text;

update public.gyms
set district = case district
  when 'Central & Western' then 'HK-CW'
  when 'Wan Chai' then 'HK-WC'
  when 'Eastern' then 'HK-EA'
  when 'Southern' then 'HK-SO'
  when 'Yau Tsim Mong' then 'HK-YTM'
  when 'Sham Shui Po' then 'HK-SSP'
  when 'Kowloon City' then 'HK-KC'
  when 'Wong Tai Sin' then 'HK-WTS'
  when 'Kwun Tong' then 'HK-KT'
  when 'Kwai Tsing' then 'HK-KTQ'
  when 'Tsuen Wan' then 'HK-TW'
  when 'Tuen Mun' then 'HK-TM'
  when 'Yuen Long' then 'HK-YL'
  when 'North' then 'HK-N'
  when 'Tai Po' then 'HK-TP'
  when 'Sha Tin' then 'HK-ST'
  when 'Sai Kung' then 'HK-SK'
  when 'Islands' then 'HK-IS'
  else district
end
where district is not null;

update public.gyms
set country = case country
  when 'Hong Kong' then 'HK'
  when 'Singapore' then 'SG'
  else country
end
where country is not null;

alter table public.gyms rename column district to district_code;
alter table public.gyms rename column country to country_code;

alter table public.gyms
  alter column country_code set default 'HK';

drop index if exists idx_gyms_district;
create index if not exists idx_gyms_district_code
  on public.gyms (district_code);

alter table public.gyms
  add constraint gyms_country_code_format
  check (country_code ~ '^[A-Z]{2}$');

alter table public.gyms
  add constraint gyms_hk_district_code
  check (
    country_code <> 'HK'
    or district_code in (
      'HK-CW',
      'HK-WC',
      'HK-EA',
      'HK-SO',
      'HK-YTM',
      'HK-SSP',
      'HK-KC',
      'HK-WTS',
      'HK-KT',
      'HK-KTQ',
      'HK-TW',
      'HK-TM',
      'HK-YL',
      'HK-N',
      'HK-TP',
      'HK-ST',
      'HK-SK',
      'HK-IS'
    )
  );
