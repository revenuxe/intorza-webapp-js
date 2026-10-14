-- Run after the security migration, inside a transaction, and roll back.
insert into auth.users(id,email,raw_user_meta_data) values
('b10d372e-09ae-4f18-9b5d-711416e50101','security-owner@example.invalid','{}'),
('b10d372e-09ae-4f18-9b5d-711416e50102','security-other@example.invalid','{}');
update public.profiles set company_name = 'Synthetic security company', country_name = 'India', org_code = 'SECURITY-CHECK'
where id = 'b10d372e-09ae-4f18-9b5d-711416e50101';

set local role anon;
do $$
declare denied boolean := false;
begin
  begin perform id from public.profiles limit 0;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonymous direct profile SELECT was not denied'; end if;
  if not exists(select 1 from public.companies_public where id = 'b10d372e-09ae-4f18-9b5d-711416e50101') then
    raise exception 'Public directory stopped working';
  end if;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','b10d372e-09ae-4f18-9b5d-711416e50101',true);
do $$
declare denied boolean; affected integer; c text;
begin
  if not exists(select 1 from public.profiles where id = auth.uid()) then raise exception 'Owner cannot read profile'; end if;
  if exists(select 1 from public.profiles where id = 'b10d372e-09ae-4f18-9b5d-711416e50102') then raise exception 'Cross-tenant profile read allowed'; end if;
  update public.profiles set company_name = 'Updated synthetic name' where id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner settings update failed'; end if;
  update public.profiles set company_name = 'Should not change' where id = 'b10d372e-09ae-4f18-9b5d-711416e50102';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-tenant profile update allowed'; end if;
  foreach c in array array['is_pro','pro_since','pro_expiry','pro_plan','payment_status','provider_customer_id','provider_subscription_id','payment_provider','promo_code'] loop
    if has_column_privilege('authenticated','public.profiles',c,'UPDATE') then raise exception 'Privileged column writable: %', c; end if;
  end loop;
  denied := false;
  begin update public.profiles set is_pro = true where id = auth.uid();
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Self-upgrade succeeded'; end if;
  denied := false;
  begin insert into public.profiles(id,is_pro) values(auth.uid(),true);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Privileged profile insertion not denied'; end if;
end;
$$;
reset role;
set local role service_role;
update public.profiles set is_pro = true where id = 'b10d372e-09ae-4f18-9b5d-711416e50101';
do $$ begin
  if not exists(select 1 from public.profiles where id = 'b10d372e-09ae-4f18-9b5d-711416e50101' and is_pro) then
    raise exception 'Trusted billing updates failed';
  end if;
end; $$;
reset role;
select 'PASS: anonymous/private isolation, directory, owner settings, denied self-upgrade/insert, trusted billing' as result;
