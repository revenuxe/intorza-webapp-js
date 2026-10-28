begin;
-- Old uploads may have paid under the analysis-time policy. Grandfather all
-- existing projects rather than risk charging them twice when history differs.
create table public.quotation_coin_delivery_rollout (
  singleton boolean primary key default true check(singleton), started_at timestamptz not null default now()
);
alter table public.quotation_coin_delivery_rollout enable row level security;
revoke all on public.quotation_coin_delivery_rollout from public,anon,authenticated;
insert into public.quotation_coin_delivery_rollout default values;
create table public.quotation_coin_deliveries (
  project_id uuid primary key references public.quotation_plan_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check(amount > 0),
  ledger_id uuid not null unique references public.coin_ledger(id),
  confirmed_at timestamptz not null default now(),
  legacy boolean not null default false
);
alter table public.quotation_coin_deliveries enable row level security;
revoke all on public.quotation_coin_deliveries from public,anon,authenticated;
grant select on public.quotation_coin_deliveries to authenticated;
create policy "Owners read quotation coin receipts" on public.quotation_coin_deliveries
for select to authenticated using(user_id=auth.uid());

-- Preserve old payments only when a debit can be linked unambiguously to a
-- project created immediately before it. Do not rewrite financial history.
with candidates as (
  select p.id project_id,p.user_id,l.id ledger_id,-l.amount amount,l.created_at,
    count(*) over(partition by p.id) project_matches,
    count(*) over(partition by l.id) ledger_matches
  from public.quotation_plan_projects p join public.coin_ledger l on l.user_id=p.user_id
    and l.tx_type=case when jsonb_array_length(p.files)>0 then 'floor_plan'::public.coin_tx_type else 'ai_builder'::public.coin_tx_type end
    and l.amount<0 and l.created_at>=p.created_at and l.created_at<=p.created_at+interval '60 seconds'
  where not exists(select 1 from public.coin_ledger r where r.tx_type='refund' and r.reference_id='quote-delivery-refund:'||l.id::text)
)
insert into public.quotation_coin_deliveries(project_id,user_id,amount,ledger_id,confirmed_at,legacy)
select project_id,user_id,amount,ledger_id,created_at,true from candidates where project_matches=1 and ledger_matches=1;

create or replace function public.quotation_estimate_ready(p_estimate jsonb)
returns boolean language sql immutable set search_path=public,pg_temp as $$
  select coalesce(jsonb_typeof(p_estimate)='object'
    and p_estimate->'incomplete'='false'::jsonb
    and jsonb_typeof(p_estimate->'totals'->'total')='number'
    and coalesce(p_estimate->'scopeGaps','[]'::jsonb)='[]'::jsonb
    and exists(select 1 from jsonb_array_elements(p_estimate->'draft'->'sections') s
      cross join lateral jsonb_array_elements(s->'items') i
      where jsonb_typeof(i->'ratePerSft')='number'),false);
$$;
revoke all on function public.quotation_estimate_ready(jsonb) from public,anon,authenticated;

create or replace function public.get_quotation_coin_delivery(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p public.quotation_plan_projects; receipt public.quotation_coin_deliveries; grandfathered boolean;
begin
  select * into p from public.quotation_plan_projects where id=p_project_id and user_id=auth.uid();
  if not found then raise exception 'Quotation project not found or access denied' using errcode='42501'; end if;
  select * into receipt from public.quotation_coin_deliveries where project_id=p.id and user_id=auth.uid();
  select p.created_at<started_at into grandfathered from public.quotation_coin_delivery_rollout;
  return jsonb_build_object('projectId',p.id,'paid',receipt.project_id is not null or grandfathered,
    'amount',coalesce(receipt.amount,case when grandfathered then 0 when jsonb_array_length(p.files)>0 then 40 else 20 end),
    'ready',public.quotation_estimate_ready(p.estimate));
end $$;

create or replace function public.confirm_quotation_coin_delivery(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.quotation_plan_projects; receipt public.quotation_coin_deliveries;
  cost integer; balance integer; ledger uuid; kind public.coin_tx_type; reference text;
begin
  -- Serialize callbacks/retries/tabs for the same result before locking wallet.
  select * into p from public.quotation_plan_projects where id=p_project_id and user_id=auth.uid() for update;
  if not found then raise exception 'Quotation project not found or access denied' using errcode='42501'; end if;
  select * into receipt from public.quotation_coin_deliveries where project_id=p.id and user_id=auth.uid();
  if found then
    select w.balance into balance from public.coin_wallets w where w.user_id=auth.uid();
    return jsonb_build_object('projectId',p.id,'paid',true,'amount',receipt.amount,'balance',balance);
  end if;
  if p.created_at<(select started_at from public.quotation_coin_delivery_rollout) then
    select w.balance into balance from public.coin_wallets w where w.user_id=auth.uid();
    return jsonb_build_object('projectId',p.id,'paid',true,'amount',0,'balance',balance);
  end if;
  if not public.quotation_estimate_ready(p.estimate) then
    raise exception 'The quotation price is not ready. No coins were deducted.' using errcode='22023';
  end if;
  if jsonb_array_length(p.files)>0 then cost:=40; kind:='floor_plan'; else cost:=20; kind:='ai_builder'; end if;
  reference:='quotation-delivered:'||p.id::text;
  perform set_config('app.confirmed_quotation_delivery',reference,true);
  balance:=public.debit_coins(auth.uid(),cost,kind,reference,'Priced AI quotation displayed');
  select id into ledger from public.coin_ledger where user_id=auth.uid() and reference_id=reference and tx_type=kind order by created_at limit 1;
  if ledger is null then raise exception 'Coin receipt could not be verified'; end if;
  insert into public.quotation_coin_deliveries(project_id,user_id,amount,ledger_id)
  values(p.id,auth.uid(),cost,ledger);
  return jsonb_build_object('projectId',p.id,'paid',true,'amount',cost,'balance',balance);
end $$;
revoke all on function public.get_quotation_coin_delivery(uuid),public.confirm_quotation_coin_delivery(uuid) from public,anon;
grant execute on function public.get_quotation_coin_delivery(uuid),public.confirm_quotation_coin_delivery(uuid) to authenticated;

-- Protect customers during rollout and from old cached frontend/worker builds:
-- legacy analysis/generation debit calls become no-ops. Only the validated
-- delivery transaction above may perform an AI debit. Admin debits are retained.
create or replace function public.debit_coins(
  p_user uuid,p_amount integer,p_type public.coin_tx_type,p_reference text default null,p_note text default ''
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare balance integer; previous public.coin_ledger;
begin
  if auth.uid() is null or p_user is null then raise exception 'Wallet access denied' using errcode='42501'; end if;
  if p_type is null or p_type not in ('floor_plan','ai_builder','admin_debit') then raise exception 'Invalid debit type'; end if;
  if p_type='admin_debit' then
    if not coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false) then raise exception 'Admin access required' using errcode='42501'; end if;
  elsif p_user<>auth.uid() then raise exception 'Wallet access denied' using errcode='42501'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Debit amount must be positive'; end if;
  if (p_type='floor_plan' and p_amount<>40) or (p_type='ai_builder' and p_amount<>20) then raise exception 'Invalid AI coin price'; end if;
  if p_type in ('floor_plan','ai_builder') and (p_reference is null or length(trim(p_reference))=0 or length(p_reference)>200) then raise exception 'AI charge reference is required'; end if;
  select w.balance into balance from public.coin_wallets w where w.user_id=p_user for update;
  if not found then raise exception 'Wallet not found. Please reload the page.'; end if;
  if p_type in ('floor_plan','ai_builder') then
    if current_setting('app.confirmed_quotation_delivery',true) is distinct from p_reference then return balance; end if;
    select * into previous from public.coin_ledger l where l.user_id=p_user and l.reference_id=p_reference and l.tx_type in ('floor_plan','ai_builder') order by l.created_at limit 1;
    if found then
      if previous.tx_type<>p_type or previous.amount<>-p_amount then raise exception 'Charge reference already used for another operation'; end if;
      return balance;
    end if;
  end if;
  if balance<p_amount then raise exception 'Insufficient coins. You need % coins but have %. Top up to continue.',p_amount,balance; end if;
  update public.coin_wallets w set balance=w.balance-p_amount,lifetime_spent=w.lifetime_spent+p_amount,updated_at=now()
  where w.user_id=p_user returning w.balance into balance;
  insert into public.coin_ledger(user_id,tx_type,amount,balance_after,reference_id,note)
  values(p_user,p_type,-p_amount,balance,p_reference,p_note);
  return balance;
end $$;
revoke all on function public.debit_coins(uuid,integer,public.coin_tx_type,text,text) from public,anon;
grant execute on function public.debit_coins(uuid,integer,public.coin_tx_type,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
