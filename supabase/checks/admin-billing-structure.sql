-- Run within a rollback-only transaction.
insert into auth.users(id,email,raw_user_meta_data,created_at) values
('a1811000-0000-4000-8000-000000000001','billing-admin@example.invalid','{}',now()),
('a1811000-0000-4000-8000-000000000002','billing-owner@example.invalid','{}',now()-interval '1 year');
insert into public.user_roles(user_id,role) values('a1811000-0000-4000-8000-000000000001','admin');
insert into public.payment_logs(user_id,provider,event_type,provider_event_id,amount,currency,status,created_at)
values('a1811000-0000-4000-8000-000000000002','razorpay','pro_activation','activation:pay_sortCheck',49900,'INR','captured',now()+interval '2 days');
insert into public.payment_logs(user_id,provider,event_type,provider_event_id,amount,currency,status,created_at)
select 'a1811000-0000-4000-8000-000000000002','razorpay','payment.failed','billing-check-'||n,49900,'INR','failed',now()+n*interval '1 minute' from generate_series(1,22) n;
insert into public.coin_wallets(user_id) values('a1811000-0000-4000-8000-000000000002') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1811000-0000-4000-8000-000000000002',true);
do $$ begin
  begin perform public.admin_user_directory(); raise exception 'Non-admin directory allowed'; exception when insufficient_privilege then null; end;
  begin perform public.admin_payment_history('a1811000-0000-4000-8000-000000000001'); raise exception 'Non-admin payment history allowed'; exception when insufficient_privilege then null; end;
  begin perform public.admin_wallet_directory(); raise exception 'Non-admin wallet directory allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a1811000-0000-4000-8000-000000000001',true);
do $$ declare data jsonb; begin
  data:=public.admin_user_directory('','all',0,'purchase');
  if data->'users'->0->>'id' <> 'a1811000-0000-4000-8000-000000000002' then raise exception 'Recent Pro purchase sort failed'; end if;
  data:=public.admin_payment_history('a1811000-0000-4000-8000-000000000002',0);
  if (data->>'total')::integer <> 23 or jsonb_array_length(data->'payments')<>20 then raise exception 'Payment first page failed'; end if;
  if data->'payments'->0->>'provider_event_id' <> 'activation:pay_sortCheck' then raise exception 'Payment newest-first failed'; end if;
  data:=public.admin_payment_history('a1811000-0000-4000-8000-000000000002',1);
  if jsonb_array_length(data->'payments')<>3 then raise exception 'Older payment history truncated'; end if;
  data:=public.admin_wallet_directory('billing-owner@example.invalid');
  if (data->>'total')::integer<>1 or data->'wallets'->0->>'login_email'<>'billing-owner@example.invalid' then raise exception 'Wallet login identity search failed'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.admin_payment_history(uuid,integer)','execute') or has_function_privilege('anon','public.admin_wallet_directory(text,integer)','execute') then raise exception 'Anonymous billing access allowed'; end if;
end $$;
select 'PASS: recent Pro purchase sorting, complete paginated payment history, wallet identity and admin-only access' as result;
