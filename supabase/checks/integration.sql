-- Read-only integration inventory. No tenant rows, credentials, or changes.
begin read only;
select 'public_tables' as check_name, jsonb_agg(jsonb_build_object(
  'table', c.relname, 'rls_enabled', c.relrowsecurity,
  'policies', (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
) order by c.relname) as result
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
union all
select 'required_functions' as check_name, jsonb_agg(jsonb_build_object(
  'function', name, 'exists', exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = name)
)) as result from (values ('is_admin'), ('respond_to_quotation'), ('save_quotation')) f(name)
union all
select 'storage_buckets' as check_name, jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id) as result from storage.buckets
union all
select 'profile_hero_image' as check_name, to_jsonb(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'hero_image_url')) as result;
rollback;
