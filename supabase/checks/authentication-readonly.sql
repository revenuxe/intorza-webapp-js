-- Read-only verification of deployed authorization; no customer records returned.
begin read only;
do $$
declare name text; column_name text;
begin
 foreach name in array array['profiles','clients','quotations','quotation_sections','quotation_items','quotation_versions','quotation_save_requests','quotation_post_save_jobs','library_personal_entries'] loop
  if not exists(select 1 from pg_tables where schemaname='public' and tablename=name and rowsecurity) then raise exception 'Owner data table missing RLS: %',name; end if;
  if has_table_privilege('anon',format('public.%I',name),'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Anonymous private-table access: %',name; end if;
 end loop;
 foreach column_name in array array['is_pro','pro_expiry','pro_plan','payment_status'] loop
  if has_column_privilege('authenticated','public.profiles',column_name,'UPDATE') then raise exception 'Browser can change entitlement: %',column_name; end if;
 end loop;
 if has_function_privilege('anon','public.save_quotation_checked(uuid,jsonb,uuid,integer,uuid)','EXECUTE') then raise exception 'Anonymous checked save allowed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d99',true);
do $$
declare denied boolean:=false;
begin
 if public.is_admin() then raise exception 'Unknown identity received administrator access'; end if;
 if exists(select 1 from public.profiles where id<>auth.uid()) or exists(select 1 from public.quotations where user_id<>auth.uid()) or exists(select 1 from public.quotation_versions v join public.quotations q on q.id=v.quotation_id where q.user_id<>auth.uid()) then raise exception 'Cross-account records visible'; end if;
 begin perform public.get_quotation_editor('f14e93d0-bf5e-4b62-b102-f39a21494d98'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Editor accepted an inaccessible quotation'; end if;
end $$;
reset role;
select 'PASS: private-table RLS, anonymous denial, protected entitlement fields, non-admin isolation and quotation owner checks' as result;
rollback;
