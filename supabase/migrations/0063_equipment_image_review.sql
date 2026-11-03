-- Research confidence and human approval are independent of inventory approval.
alter table public.equipment
  add column official_name text,
  add column official_model_number text,
  add column official_product_url text,
  add column official_status text not null default 'not_researched'
    check (official_status in ('not_researched', 'ambiguous_model', 'candidate_requires_review',
      'model_verified', 'model_verified_image_missing', 'unresolved')),
  add column official_review_note text,
  add column official_verified_at timestamptz,
  add column official_verified_by text;

comment on column public.equipment.official_verified_by is 'Firebase UID of the reviewing admin; assigned by the authenticated server action.';
comment on column public.equipment.official_status is 'Research outcome, retained independently of manual approval and gym inventory verification.';

alter table public.equipment_images
  add column image_role text not null default 'captured' check (image_role in ('captured', 'official')),
  add column storage_path text;
update public.equipment_images set image_role = 'official' where source_type = 'official';
-- Renaming machine_id to equipment_id does not rename its UNIQUE constraint.
-- Find the legacy two-column key by its columns rather than its historic name.
do $$
declare legacy_name text;
begin
  for legacy_name in
    select c.conname from pg_constraint c
    where c.conrelid='public.equipment_images'::regclass and c.contype='u'
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(c.conkey) k(attnum)
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum)
          = array['equipment_id','url']::text[]
  loop
    execute format('alter table public.equipment_images drop constraint %I',legacy_name);
  end loop;
end $$;
alter table public.equipment_images add constraint equipment_images_role_url_key unique (equipment_id, image_role, url);
alter table public.equipment_images add constraint equipment_image_storage_path check (
  storage_path is null or (storage_path like equipment_id::text || '/' || id::text || '/%'
    and storage_path !~ '(^|/)\.\.(/|$)' and storage_path !~ '^/'));
comment on column public.equipment_images.url is 'Original captured or manufacturer image URL; never replaced by a Storage URL.';
comment on column public.equipment_images.storage_path is 'Object path in the equipment-images bucket. Null until upload succeeds.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-images', 'equipment-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- No client upload policies: authenticated admin server actions use service_role.

create function public.invalidate_equipment_official_review() returns trigger
language plpgsql set search_path = public as $$
begin
  if row(new.brand_id,new.name,new.name_zh,new.model_number,new.product_url,new.source_external_id,
         new.official_name,new.official_model_number,new.official_product_url,new.official_status,new.official_review_note)
     is distinct from
     row(old.brand_id,old.name,old.name_zh,old.model_number,old.product_url,old.source_external_id,
         old.official_name,old.official_model_number,old.official_product_url,old.official_status,old.official_review_note) then
    new.official_verified_at := null;
    new.official_verified_by := null;
  end if;
  return new;
end $$;
create trigger trg_equipment_official_review before update on public.equipment
for each row execute function public.invalidate_equipment_official_review();

create function public.invalidate_equipment_image_review() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.equipment_id <> old.equipment_id then raise exception 'Images cannot move between equipment'; end if;
    if new.url is distinct from old.url then
      new.storage_path := null;
      new.is_primary := false;
    end if;
  end if;
  if tg_op = 'DELETE' then
    update public.equipment set official_verified_at=null,official_verified_by=null where id=old.equipment_id;
    return old;
  end if;
  if tg_op = 'INSERT' then
    update public.equipment set official_verified_at=null,official_verified_by=null where id=new.equipment_id;
  elsif row(new.url,new.image_role,new.source_url) is distinct from row(old.url,old.image_role,old.source_url) then
    update public.equipment set official_verified_at=null,official_verified_by=null where id=new.equipment_id;
  end if;
  if new.is_primary and new.storage_path is null then
    raise exception 'Upload the image to Storage before selecting it as primary';
  end if;
  return new;
end $$;
create trigger trg_equipment_image_review before insert or update or delete on public.equipment_images
for each row execute function public.invalidate_equipment_image_review();

-- All mutations lock the parent first. Optimistic revisions prevent stale admin
-- forms from approving a different set of data than the one shown.
create function public.save_equipment_official_review(p_id uuid, p_expected_updated_at timestamptz,
  p_name text, p_model text, p_product_url text, p_status text, p_note text, p_verify boolean, p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare machine public.equipment;
begin
  select * into strict machine from public.equipment where id=p_id for update;
  if machine.updated_at is distinct from p_expected_updated_at then raise exception 'Stale equipment review'; end if;
  update public.equipment set official_name=nullif(btrim(p_name),''), official_model_number=nullif(btrim(p_model),''),
    official_product_url=nullif(btrim(p_product_url),''),official_status=p_status,official_review_note=nullif(btrim(p_note),'')
    where id=p_id;
  if p_verify and (nullif(btrim(p_actor),'') is null or nullif(btrim(p_name),'') is null) then
    raise exception 'Verified official data requires a name and admin identity';
  end if;
  update public.equipment set official_verified_at=case when p_verify then clock_timestamp() else null end,
    official_verified_by=case when p_verify then p_actor else null end where id=p_id;
end $$;

create function public.save_equipment_review_image(p_id uuid, p_expected_updated_at timestamptz,
  p_image_id uuid, p_role text, p_url text, p_source_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare machine public.equipment; image_id uuid;
begin
  select * into strict machine from public.equipment where id=p_id for update;
  if machine.updated_at is distinct from p_expected_updated_at then raise exception 'Stale equipment review'; end if;
  if nullif(btrim(p_url),'') is null then raise exception 'Image URL is required'; end if;
  if p_image_id is null then
    insert into public.equipment_images(equipment_id,image_role,url,source_url,source_type)
      values(p_id,p_role,p_url,nullif(p_source_url,''),case when p_role='official' then 'official' else 'manual' end)
      returning id into image_id;
  else
    update public.equipment_images set image_role=p_role,url=p_url,source_url=nullif(p_source_url,'')
      where id=p_image_id and equipment_id=p_id returning id into image_id;
    if image_id is null then raise exception 'Image not found'; end if;
  end if;
  return image_id;
end $$;

create function public.select_equipment_primary_image(p_id uuid, p_image_id uuid,
  p_expected_url text, p_storage_path text default null)
returns void language plpgsql security definer set search_path = public as $$
declare image public.equipment_images;
begin
  perform 1 from public.equipment where id=p_id for update;
  select * into strict image from public.equipment_images where id=p_image_id and equipment_id=p_id for update;
  if image.url is distinct from p_expected_url then raise exception 'Stale image URL'; end if;
  if p_storage_path is not null then
    if not exists(select 1 from storage.objects where bucket_id='equipment-images' and name=p_storage_path) then
      raise exception 'Storage object not found';
    end if;
    update public.equipment_images set storage_path=p_storage_path where id=p_image_id;
  elsif image.storage_path is null then raise exception 'Upload the image before selecting it';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='equipment-images' and name=coalesce(p_storage_path,image.storage_path)) then
    raise exception 'Storage object not found';
  end if;
  update public.equipment_images set is_primary=false where equipment_id=p_id and is_primary and id<>p_image_id;
  update public.equipment_images set is_primary=true where id=p_image_id;
end $$;

-- A research import is atomic per equipment and cannot overwrite approved data.
create function public.import_equipment_official_research(p_external_id text, p_source_model text,
  p_research jsonb, p_images jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare machine public.equipment; img jsonb;
begin
  select * into strict machine from public.equipment where source_external_id=p_external_id for update;
  if btrim(coalesce(machine.model_number,'')) <> btrim(coalesce(p_source_model,'')) then
    raise exception 'Research source model does not match equipment';
  end if;
  if machine.official_verified_at is not null then return 'skipped_verified'; end if;
  update public.equipment set official_name=p_research->>'name',official_model_number=p_research->>'model',
    official_product_url=p_research->>'product_url',official_status=p_research->>'status',
    official_review_note=p_research->>'note' where id=machine.id;
  for img in select value from jsonb_array_elements(p_images) loop
    insert into public.equipment_images(equipment_id,image_role,url,source_url,source_type,source_external_key)
      values(machine.id,img->>'role',img->>'url',img->>'source_url',
        case when img->>'role'='official' then 'official' else 'manual' end,p_external_id)
      on conflict (equipment_id,image_role,url) do nothing;
  end loop;
  return 'imported';
end $$;

revoke all on function public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.save_equipment_review_image(uuid,timestamptz,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.select_equipment_primary_image(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.import_equipment_official_research(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_equipment_official_review(uuid,timestamptz,text,text,text,text,text,boolean,text) to service_role;
grant execute on function public.save_equipment_review_image(uuid,timestamptz,uuid,text,text,text) to service_role;
grant execute on function public.select_equipment_primary_image(uuid,uuid,text,text) to service_role;
grant execute on function public.import_equipment_official_research(text,text,jsonb,jsonb) to service_role;
