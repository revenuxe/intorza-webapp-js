-- Synthetic accounts only; every wallet, ledger and receipt change rolls back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('a2812000-0000-4000-8000-000000000001','delivery-owner@example.invalid','{}'),
('a2812000-0000-4000-8000-000000000002','delivery-other@example.invalid','{}');
update public.coin_wallets set balance=100 where user_id='a2812000-0000-4000-8000-000000000001';
insert into public.quotation_plan_projects(id,user_id,files,analysis,estimate) values
('a2812000-0000-4000-8000-000000000003','a2812000-0000-4000-8000-000000000001','[]','{}',null),
('a2812000-0000-4000-8000-000000000004','a2812000-0000-4000-8000-000000000001','[{"path":"private-plan.pdf"}]','{}','{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}'),
('a2812000-0000-4000-8000-000000000005','a2812000-0000-4000-8000-000000000001','[]','{}','{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}'),
('a2812000-0000-4000-8000-000000000006','a2812000-0000-4000-8000-000000000002','[]','{}',null),
('a2812000-0000-4000-8000-000000000007','a2812000-0000-4000-8000-000000000001','[]','{}','{"incomplete":true,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2812000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb; current_balance integer; begin
  insert into public.quotation_plan_projects(id,user_id,analysis,created_at)
  values('a2812000-0000-4000-8000-000000000008',auth.uid(),'{}','2000-01-01');
  if (public.get_quotation_coin_delivery('a2812000-0000-4000-8000-000000000008')->>'paid')::boolean then raise exception 'Backdated new project bypassed billing'; end if;
  begin update public.quotation_plan_projects set created_at='2000-01-01' where id='a2812000-0000-4000-8000-000000000008'; raise exception 'Owner backdated project'; exception when insufficient_privilege then null; end;
  perform public.debit_coins(auth.uid(),40,'floor_plan','legacy-analysis-attempt','Floor plan analysis');
  select balance into current_balance from public.coin_wallets where user_id=auth.uid();
  if current_balance<>100 then raise exception 'Legacy analysis charged coins'; end if;
  if (public.get_quotation_coin_delivery('a2812000-0000-4000-8000-000000000003')->>'ready')::boolean then raise exception 'Analysis-only project ready for billing'; end if;
  begin perform public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000003'); raise exception 'Analysis-only project charged'; exception when invalid_parameter_value then null; end;
  begin perform public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000007'); raise exception 'Partial price charged'; exception when invalid_parameter_value then null; end;
  result:=public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000004');
  if (result->>'balance')::integer<>60 then raise exception 'Floor-plan result must cost exactly 40'; end if;
  result:=public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000004');
  if (result->>'balance')::integer<>60 then raise exception 'Retry charged twice'; end if;
  result:=public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000005');
  if (result->>'balance')::integer<>40 then raise exception 'Details result must cost exactly 20'; end if;
  if (select count(*) from public.coin_ledger where user_id=auth.uid() and tx_type in ('floor_plan','ai_builder'))<>2 then raise exception 'Unexpected debit count'; end if;
  begin perform public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000006'); raise exception 'Foreign project charged'; exception when insufficient_privilege then null; end;
  begin update public.quotation_coin_deliveries set amount=1 where user_id=auth.uid(); raise exception 'Owner changed receipt'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.coin_wallets set balance=0 where user_id='a2812000-0000-4000-8000-000000000001';
update public.quotation_plan_projects set estimate='{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}'
where id='a2812000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ begin
  begin perform public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000003'); raise exception 'Insufficient balance accepted';
  exception when raise_exception then if sqlerrm not like 'Insufficient coins%' then raise; end if; end;
  if exists(select 1 from public.quotation_coin_deliveries where project_id='a2812000-0000-4000-8000-000000000003') then raise exception 'Failed charge left a paid receipt'; end if;
end $$;
reset role;
update public.coin_wallets set balance=20 where user_id='a2812000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare result jsonb; begin
  result:=public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000003');
  if (result->>'balance')::integer<>0 then raise exception 'Confirmation retry after top-up failed'; end if;
  result:=public.confirm_quotation_coin_delivery('a2812000-0000-4000-8000-000000000003');
  if (result->>'balance')::integer<>0 then raise exception 'Zero-balance retry charged twice'; end if;
end $$;
reset role;
select 'PASS: no analysis/partial charge; final-price fees; idempotent retries; owner isolation; immutable receipts; insufficient-balance rollback and retry' as result;
rollback;
