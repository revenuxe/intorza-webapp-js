select jsonb_build_object(
  'migration', (select name from supabase_migrations.schema_migrations where version='20261015160000'),
  'tables', (select jsonb_agg(jsonb_build_object('name',c.relname,'rls_enabled',c.relrowsecurity,
    'anon_access',has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),
    'browser_admin_access',has_table_privilege('authenticated',c.oid,'TRUNCATE,REFERENCES,TRIGGER')))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('quotation_plan_projects','quotation_approved_rates')),
  'bucket', (select jsonb_build_object('id',id,'public',public,'max_bytes',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='quotation-floor-plans'),
  'owner_policies', (select count(*) from pg_policies where (schemaname='public' and tablename in ('quotation_plan_projects','quotation_approved_rates')) or (schemaname='storage' and policyname in ('Owners read floor plans','Owners upload floor plans','Owners delete floor plans')))
) as floor_plan_status;
