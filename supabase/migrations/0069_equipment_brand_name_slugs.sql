-- Slugs use public brand/name only, never captured names or source identities.
-- Existing slugs may encode private source IDs, so do not publish them as aliases.
begin;
lock table public.equipment in share row exclusive mode;

create function public.equipment_slug_part(value text) returns text
language sql immutable set search_path = public as $$
  select trim(both '-' from regexp_replace(lower(normalize(coalesce(value,''), NFKD)), '[^a-z0-9]+', '-', 'g'));
$$;

create function public.equipment_slug_base(p_brand_id uuid, p_name text) returns text
language plpgsql stable security definer set search_path = public as $$
declare brand_slug text; token text; name_part text := public.equipment_slug_part(p_name);
begin
  select b.slug into strict brand_slug from public.equipment_brands b where b.id=p_brand_id;
  -- Match whole normalized tokens, longest brand alias first (not substrings).
  for token in
    select t from (
      select distinct public.equipment_slug_part(v) t from public.equipment_brands b,
        lateral unnest(array[b.slug,b.name_en] || coalesce(b.aliases,'{}'::text[])) v
      where b.id=p_brand_id and public.equipment_slug_part(v) <> ''
    ) tokens order by length(t) desc, t
  loop
    if position('-' || token || '-' in '-' || name_part || '-') > 0 then
      name_part := trim(both '-' from replace('-' || name_part || '-', '-' || token || '-', '-'));
      exit;
    end if;
  end loop;
  return brand_slug || case when name_part='' then '' else '-' || name_part end;
end $$;

-- Generate the complete plan before changing rows; every initial duplicate gets
-- its own UUID suffix. Extend prefixes if even an eight-character prefix clashes.
create temporary table equipment_slug_plan on commit drop as
select id, base, base as slug, count(*) over(partition by base)>1 as duplicate
from (select id,public.equipment_slug_base(brand_id,name) base from public.equipment) e;
update equipment_slug_plan set slug=base || '-' || left(replace(id::text,'-',''),8) where duplicate;
do $$
declare n integer := 8;
begin
  while exists(select 1 from equipment_slug_plan group by slug having count(*)>1) loop
    n := n+1;
    if n>32 then raise exception 'Unable to allocate unique equipment slugs'; end if;
    update equipment_slug_plan p set slug=p.base || '-' || left(replace(p.id::text,'-',''),n)
    where p.slug in (select slug from equipment_slug_plan group by slug having count(*)>1);
  end loop;
end $$;
-- Drop the old per-brand constraint during the atomic rewrite to avoid temporary
-- conflicts with another row's old slug. The new global index is stricter.
alter table public.equipment drop constraint equipment_brand_id_slug_key;
update public.equipment e set slug=p.slug from equipment_slug_plan p where e.id=p.id and e.slug<>p.slug;
create unique index equipment_slug_unique on public.equipment(slug);

create function public.assign_equipment_slug() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n integer := 8;
begin
  if tg_op='UPDATE' then
    new.slug := old.slug; -- Names, importer retries and admin saves keep URLs stable.
    return new;
  end if;
  base := public.equipment_slug_base(new.brand_id,new.name);
  perform pg_advisory_xact_lock(hashtextextended(base,0));
  candidate := base;
  while exists(select 1 from public.equipment where slug=candidate) loop
    candidate := base || '-' || left(replace(new.id::text,'-',''),n);
    n := n+1;
    if n>33 then raise exception 'Unable to allocate unique equipment slug'; end if;
  end loop;
  new.slug := candidate;
  return new;
end $$;
-- Run after display-name normalization, before the review trigger.
create trigger trg_equipment_display_slug before insert or update on public.equipment
for each row execute function public.assign_equipment_slug();
revoke all on function public.equipment_slug_part(text), public.equipment_slug_base(uuid,text), public.assign_equipment_slug() from public,anon,authenticated;
commit;
