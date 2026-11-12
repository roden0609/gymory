begin;
do $$
declare b uuid; a uuid := 'abcdef12-1111-4111-8111-111111111111'; c uuid := 'abcdef12-2222-4222-8222-222222222222'; d uuid := gen_random_uuid(); saved text;
begin
  insert into public.equipment_brands(slug,name_en,aliases) values('slug-test-brand','Slug Test Brand',array['STB']) returning id into b;
  if public.equipment_slug_base(b,'STB Full Rack') <> 'slug-test-brand-full-rack'
    or public.equipment_slug_base(b,'Slug Test Brand Full Rack') <> 'slug-test-brand-full-rack'
    or public.equipment_slug_base(b,'Full Rack') <> 'slug-test-brand-full-rack'
    or public.equipment_slug_base(b,'STBench') <> 'slug-test-brand-stbench' then
    raise exception 'Brand normalization failed';
  end if;
  insert into public.equipment(id,brand_id,name,slug,source_type) values(d,b,'Rack','ignored','manual');
  insert into public.equipment(id,brand_id,name,slug,source_type) values(a,b,'Rack','ignored','manual');
  insert into public.equipment(id,brand_id,name,slug,source_type) values(c,b,'Rack','ignored','manual');
  if (select slug from public.equipment where id=d)<>'slug-test-brand-rack'
    or (select slug from public.equipment where id=a)<>'slug-test-brand-rack-abcdef12'
    or (select slug from public.equipment where id=c)<>'slug-test-brand-rack-abcdef122' then
    raise exception 'Stable ID collision allocation failed';
  end if;
  select slug into saved from public.equipment where id=a;
  update public.equipment set name='Updated Name',slug='attempted-replacement' where id=a;
  if (select slug from public.equipment where id=a)<>saved then raise exception 'Slug changed on edit'; end if;
  if exists(select slug from public.equipment group by slug having count(*)>1) then raise exception 'Duplicate slug'; end if;
  if has_column_privilege('anon','public.equipment','source_external_id','SELECT')
    or has_column_privilege('authenticated','public.equipment','captured_name','SELECT') then
    raise exception 'Private column exposed';
  end if;
end $$;
rollback;
