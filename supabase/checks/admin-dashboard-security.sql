-- Run in a transaction and roll back. No real accounts are changed.
insert into auth.users(id,email,raw_user_meta_data) values
('a1812000-0000-4000-8000-000000000001','audit-admin@example.invalid','{}'),
('a1812000-0000-4000-8000-000000000002','audit-customer@example.invalid','{}');
insert into public.user_roles(user_id,role) values('a1812000-0000-4000-8000-000000000001','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1812000-0000-4000-8000-000000000002',true);
do $$ begin
  if public.is_admin() then raise exception 'Customer treated as admin'; end if;
  begin
    insert into public.user_roles(user_id,role) values(auth.uid(),'admin');
    raise exception 'Customer self-promoted';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set is_pro=true where id=auth.uid();
    raise exception 'Customer self-upgraded';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_set_pro_access('a1812000-0000-4000-8000-000000000001',auth.uid(),30); raise exception 'Spoofed admin Pro grant allowed'; exception when insufficient_privilege or raise_exception then if sqlerrm='Spoofed admin Pro grant allowed' then raise; end if; end;
  begin perform public.admin_adjust_coins('a1812000-0000-4000-8000-000000000001',auth.uid(),100); raise exception 'Spoofed admin coin grant allowed'; exception when insufficient_privilege or raise_exception then if sqlerrm='Spoofed admin coin grant allowed' then raise; end if; end;
  begin perform public.admin_user_directory(); raise exception 'Customer directory allowed'; exception when insufficient_privilege then null; end;
  begin perform public.admin_payment_history('a1812000-0000-4000-8000-000000000001'); raise exception 'Customer foreign history allowed'; exception when insufficient_privilege then null; end;
  begin perform public.admin_wallet_directory(); raise exception 'Customer wallets allowed'; exception when insufficient_privilege then null; end;
  if exists(select 1 from public.profiles where id='a1812000-0000-4000-8000-000000000001') then raise exception 'Foreign private profile visible'; end if;
end $$;
select set_config('request.jwt.claim.sub','a1812000-0000-4000-8000-000000000001',true);
do $$ begin
  if not public.is_admin() then raise exception 'Admin positive control failed'; end if;
  perform public.admin_set_pro_access(auth.uid(),'a1812000-0000-4000-8000-000000000002',30);
  perform public.admin_adjust_coins(auth.uid(),'a1812000-0000-4000-8000-000000000002',10);
  if not exists(select 1 from public.profiles where id='a1812000-0000-4000-8000-000000000002' and is_pro) then raise exception 'Admin grant did not persist'; end if;
  if not exists(select 1 from public.subscription_events where user_id='a1812000-0000-4000-8000-000000000002' and actor=auth.uid()::text) then raise exception 'Pro audit actor missing'; end if;
  if not exists(select 1 from public.coin_ledger where user_id='a1812000-0000-4000-8000-000000000002' and tx_type='admin_credit') then raise exception 'Coin ledger missing'; end if;
end $$;
reset role;
delete from public.user_roles where user_id='a1812000-0000-4000-8000-000000000001' and role='admin';
set local role authenticated;
do $$ begin
  if public.is_admin() then raise exception 'Revoked role still trusted'; end if;
  begin perform public.admin_user_directory(); raise exception 'Revoked admin directory access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: role escalation, entitlement self-upgrade, spoofed admin actions and foreign identity reads denied; admin grants audited; revoked role rejected' as result;
