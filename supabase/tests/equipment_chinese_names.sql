-- Run after 0057 with psql -v ON_ERROR_STOP=1 -f this file.
begin;
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment'
      and column_name = 'name_zh'
      and data_type = 'text'
      and is_nullable = 'YES'
      and column_default is null
  ) then
    raise exception 'Equipment name_zh must be nullable text without a default';
  end if;
end $$;
rollback;
