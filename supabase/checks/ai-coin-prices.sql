-- Synthetic account and wallet only; all changes are rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data)
values ('b9cf3f59-87f8-4795-b238-1a5dcb946f35','coin-price-check@example.invalid','{"full_name":"Coin check"}');
insert into public.coin_wallets(user_id,balance,lifetime_earned)
values ('b9cf3f59-87f8-4795-b238-1a5dcb946f35',60,60)
on conflict(user_id) do update set balance=60,lifetime_earned=60,lifetime_spent=0;
insert into public.quotation_plan_projects(id,user_id,files,analysis,estimate) values
('b9cf3f59-87f8-4795-b238-1a5dcb946f36','b9cf3f59-87f8-4795-b238-1a5dcb946f35','[{"path":"plan.pdf"}]','{}','{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}'),
('b9cf3f59-87f8-4795-b238-1a5dcb946f37','b9cf3f59-87f8-4795-b238-1a5dcb946f35','[]','{}','{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}'),
('b9cf3f59-87f8-4795-b238-1a5dcb946f38','b9cf3f59-87f8-4795-b238-1a5dcb946f35','[]','{}','{"incomplete":false,"scopeGaps":[],"totals":{"total":1000},"draft":{"sections":[{"items":[{"ratePerSft":100}]}]}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','b9cf3f59-87f8-4795-b238-1a5dcb946f35',true);
do $$
declare u uuid := auth.uid(); b integer; rejected boolean;
begin
  b := public.debit_coins(u,40,'floor_plan','coin-check-plan');
  if b <> 60 then raise exception 'Legacy analysis call deducted coins'; end if;
  b := (public.confirm_quotation_coin_delivery('b9cf3f59-87f8-4795-b238-1a5dcb946f36')->>'balance')::integer;
  if b <> 20 then raise exception 'Floor plan price check failed'; end if;
  b := (public.confirm_quotation_coin_delivery('b9cf3f59-87f8-4795-b238-1a5dcb946f36')->>'balance')::integer;
  if b <> 20 then raise exception 'Duplicate charge check failed'; end if;
  b := (public.confirm_quotation_coin_delivery('b9cf3f59-87f8-4795-b238-1a5dcb946f37')->>'balance')::integer;
  if b <> 0 then raise exception 'Quotation price check failed'; end if;
  rejected := false;
  begin perform public.confirm_quotation_coin_delivery('b9cf3f59-87f8-4795-b238-1a5dcb946f38');
  exception when others then
    if sqlerrm not like 'Insufficient coins.%' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Insufficient balance was accepted'; end if;
  rejected := false;
  begin perform public.debit_coins(u,1,'ai_builder','coin-check-tampered');
  exception when others then
    if sqlerrm <> 'Invalid AI coin price' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Invalid price was accepted'; end if;
  rejected := false;
  begin perform public.debit_coins(u,1,'admin_debit','coin-check-admin');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Non-admin debit was accepted'; end if;
  if (select lifetime_spent from public.coin_wallets where user_id=u) <> 60 then
    raise exception 'Lifetime spent check failed';
  end if;
end $$;
rollback;
select 'AI coin pricing checks passed; synthetic changes rolled back' as result;
