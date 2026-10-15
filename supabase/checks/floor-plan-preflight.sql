select jsonb_build_object(
  'plans', to_regclass('public.quotation_plan_projects'),
  'rates', to_regclass('public.quotation_approved_rates'),
  'migrations', (select jsonb_agg(jsonb_build_object('version',version,'name',name)) from supabase_migrations.schema_migrations where version in ('20261015120000','20261015160000')),
  'defaults', (select jsonb_agg(jsonb_build_object('role',defaclrole::regrole::text,'schema',defaclnamespace::regnamespace::text,'acl',defaclacl::text)) from pg_default_acl),
  'ledger_columns', (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type)) from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations'),
  'storage_policies', (select jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'permissive',permissive,'using',qual,'check',with_check)) from pg_policies where schemaname='storage' and tablename='objects')
) as preflight;
