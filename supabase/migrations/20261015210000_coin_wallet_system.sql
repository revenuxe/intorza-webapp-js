begin;

-- Extend the existing payment-attempt limiter for coin checkout.
create or replace function public.consume_user_api_limit(p_user uuid,p_operation text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare cap integer; used integer;
begin
  cap:=case p_operation when 'razorpay-create-subscription' then 10 when 'razorpay-verify-payment' then 30 when 'razorpay-create-coin-order' then 10 when 'razorpay-verify-coin-payment' then 30 when 'create-team-member-auth' then 5 else 0 end;
  if cap=0 or p_user is null then raise exception 'Unsupported API operation'; end if;
  insert into public.api_rate_limits(user_id,operation) values(p_user,p_operation)
  on conflict(user_id,operation) do update set window_started=case when api_rate_limits.window_started <= now()-interval '1 minute' then now() else api_rate_limits.window_started end, hits=case when api_rate_limits.window_started <= now()-interval '1 minute' then 1 else least(api_rate_limits.hits+1,1000000) end
  returning hits into used;
  return used<=cap;
end; $$;

-- ============================================================
-- Coin wallet: one row per user, balance updated atomically.
-- ============================================================
create table public.coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  lifetime_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coin_wallets enable row level security;
create policy "Users and admins read wallets" on public.coin_wallets for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- Coin ledger: immutable append-only audit trail.
-- Every credit and debit is a separate row.
-- ============================================================
create type public.coin_tx_type as enum (
  'welcome',           -- 60 free coins on signup
  'purchase',          -- Razorpay top-up
  'admin_credit',      -- manual admin adjustment (positive)
  'admin_debit',       -- manual admin adjustment (negative)
  'floor_plan',        -- 15-coin deduction for plan analysis
  'ai_builder',        -- 10-coin deduction for AI builder
  'refund'             -- reversal / failed operation refund
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tx_type public.coin_tx_type not null,
  amount integer not null,  -- positive = credit, negative = debit
  balance_after integer not null,
  reference_id text,        -- Razorpay order/payment ID, project ID, etc.
  note text default '',
  created_at timestamptz not null default now()
);

create index coin_ledger_user_created on public.coin_ledger(user_id, created_at desc);
create index coin_ledger_tx_type on public.coin_ledger(tx_type, created_at desc);

alter table public.coin_ledger enable row level security;
create policy "Users and admins read ledger" on public.coin_ledger for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- Coin payments: Razorpay orders for coin top-ups.
-- ============================================================
create table public.coin_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  coins integer not null check (coins > 0),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index coin_payments_user on public.coin_payments(user_id, created_at desc);
create index coin_payments_order on public.coin_payments(razorpay_order_id);

alter table public.coin_payments enable row level security;
create policy "Users and admins read payments" on public.coin_payments for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- Atomic debit: deducts coins and writes a ledger record.
-- Returns the new balance, or raises an exception on
-- insufficient funds so the caller can present a top-up prompt.
-- ============================================================
create or replace function public.debit_coins(
  p_user uuid,
  p_amount integer,
  p_type public.coin_tx_type,
  p_reference text default null,
  p_note text default ''
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_balance integer;
begin
  if p_user is null or p_user <> auth.uid() then raise exception 'Wallet access denied' using errcode='42501'; end if;
  if p_type not in ('floor_plan','ai_builder','admin_debit') then raise exception 'Invalid debit type'; end if;
  if p_amount <= 0 then raise exception 'Debit amount must be positive'; end if;

  update public.coin_wallets
    set balance = balance - p_amount,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = now()
    where user_id = p_user and balance >= p_amount
    returning balance into v_balance;

  if not found then
    -- Check whether the wallet exists at all
    select balance into v_balance from public.coin_wallets where user_id = p_user;
    if not found then raise exception 'Wallet not found. Please reload the page.'; end if;
    raise exception 'Insufficient coins. You need % coins but have %. Top up to continue.', p_amount, v_balance;
  end if;

  insert into public.coin_ledger(user_id, tx_type, amount, balance_after, reference_id, note)
    values (p_user, p_type, -p_amount, v_balance, p_reference, p_note);

  return v_balance;
end;
$$;

-- ============================================================
-- Atomic credit: adds coins and writes a ledger record.
-- ============================================================
create or replace function public.credit_coins(
  p_user uuid,
  p_amount integer,
  p_type public.coin_tx_type,
  p_reference text default null,
  p_note text default ''
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then raise exception 'Credit amount must be positive'; end if;

  insert into public.coin_wallets(user_id, balance, lifetime_earned)
    values (p_user, p_amount, p_amount)
    on conflict (user_id) do update
      set balance = coin_wallets.balance + p_amount,
          lifetime_earned = coin_wallets.lifetime_earned + p_amount,
          updated_at = now()
    returning balance into v_balance;

  insert into public.coin_ledger(user_id, tx_type, amount, balance_after, reference_id, note)
    values (p_user, p_type, p_amount, v_balance, p_reference, p_note);

  return v_balance;
end;
$$;

-- ============================================================
-- Welcome coins: auto-create wallet with 60 coins on signup.
-- ============================================================
create or replace function public.handle_new_user_coins()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.credit_coins(new.id, 60, 'welcome', null, 'Welcome bonus');
  return new;
end;
$$;

create trigger on_auth_user_created_coins
  after insert on auth.users
  for each row execute function public.handle_new_user_coins();

-- ============================================================
-- Razorpay coin purchase verification: credits coins after
-- payment is confirmed. Idempotent on razorpay_payment_id.
-- ============================================================
create or replace function public.verify_coin_purchase(
  p_user uuid,
  p_order_id text,
  p_payment_id text,
  p_coins integer,
  p_amount_paise integer,
  p_currency text default 'INR'
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_balance integer;
  v_payment public.coin_payments;
begin
  if p_user is null or p_coins <= 0 or p_coins > 100000 or p_amount_paise <> p_coins * 100 or p_currency <> 'INR' then raise exception 'Invalid coin purchase facts'; end if;
  -- Idempotency: if already verified, return current balance
  select * into v_payment from public.coin_payments
    where razorpay_order_id = p_order_id and user_id = p_user;

  if found and v_payment.status = 'paid' then
    select balance into v_balance from public.coin_wallets where user_id = p_user;
    return v_balance;
  end if;

  if found and v_payment.status != 'created' then
    raise exception 'This payment has already been processed with status: %', v_payment.status;
  end if;
  if not found or v_payment.coins <> p_coins or v_payment.amount_paise <> p_amount_paise or v_payment.currency <> p_currency then raise exception 'Coin order mismatch'; end if;

  -- Update the payment record
  update public.coin_payments
    set status = 'paid',
        razorpay_payment_id = p_payment_id,
        verified_at = now()
    where razorpay_order_id = p_order_id and user_id = p_user and status = 'created';

  if not found then
    raise exception 'Payment record not found or already processed.';
  end if;

  -- Credit the coins
  v_balance := public.credit_coins(p_user, p_coins, 'purchase', p_order_id,
    format('Razorpay %s: %s coins for %s paise', p_payment_id, p_coins, p_amount_paise));

  return v_balance;
end;
$$;

-- ============================================================
-- Admin: adjust user balance (credit or debit).
-- Only callable by admins through the API (not directly by users).
-- ============================================================
create or replace function public.admin_adjust_coins(
  p_admin uuid,
  p_user uuid,
  p_amount integer,
  p_note text default 'Admin adjustment'
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_balance integer;
  v_is_admin boolean;
begin
  select public.has_role(auth.uid(), 'admin'::public.app_role) into v_is_admin;
  if not v_is_admin then raise exception 'Admin access required'; end if;
  if p_admin is null or p_admin <> auth.uid() then raise exception 'Admin identity mismatch'; end if;

  if p_amount > 0 then
    v_balance := public.credit_coins(p_user, p_amount, 'admin_credit', p_admin::text, p_note);
  elsif p_amount < 0 then
    v_balance := public.debit_coins(p_user, -p_amount, 'admin_debit', p_admin::text, p_note);
  else
    raise exception 'Adjustment amount cannot be zero';
  end if;

  return v_balance;
end;
$$;

-- ============================================================
-- Admin views: wallet overview and payment reporting.
-- ============================================================
create or replace function public.admin_coin_overview()
returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_is_admin boolean;
begin
  select public.has_role(auth.uid(), 'admin'::public.app_role) into v_is_admin;
  if not v_is_admin then raise exception 'Admin access required'; end if;

  return (select json_build_object(
    'total_users', (select count(*) from public.coin_wallets),
    'total_balance', (select coalesce(sum(balance), 0) from public.coin_wallets),
    'total_earned', (select coalesce(sum(lifetime_earned), 0) from public.coin_wallets),
    'total_spent', (select coalesce(sum(lifetime_spent), 0) from public.coin_wallets),
    'purchases_today', (select count(*) from public.coin_payments where status = 'paid' and verified_at >= current_date),
    'revenue_today_paise', (select coalesce(sum(amount_paise), 0) from public.coin_payments where status = 'paid' and verified_at >= current_date),
    'operations_today', (select json_build_object(
      'floor_plan', (select count(*) from public.coin_ledger where tx_type = 'floor_plan' and created_at >= current_date),
      'ai_builder', (select count(*) from public.coin_ledger where tx_type = 'ai_builder' and created_at >= current_date)
    ))
  ));
end;
$$;

-- Owner-only reversal used by the AI endpoint when a charged request fails.
create or replace function public.refund_failed_ai_charge(p_reference text, p_note text default 'AI request failed; coins restored')
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_debit public.coin_ledger; v_balance integer;
begin
  if auth.uid() is null or p_reference is null or length(p_reference)>200 then raise exception 'Invalid refund request'; end if;
  select * into v_debit from public.coin_ledger where user_id=auth.uid() and reference_id=p_reference and tx_type in ('floor_plan','ai_builder') order by created_at desc limit 1;
  if not found then raise exception 'Charge not found'; end if;
  if exists(select 1 from public.coin_ledger where user_id=auth.uid() and tx_type='refund' and reference_id='refund:'||p_reference) then
    select balance into v_balance from public.coin_wallets where user_id=auth.uid(); return v_balance;
  end if;
  update public.coin_wallets set balance=balance + abs(v_debit.amount), lifetime_earned=lifetime_earned + abs(v_debit.amount), updated_at=now() where user_id=auth.uid() returning balance into v_balance;
  insert into public.coin_ledger(user_id,tx_type,amount,balance_after,reference_id,note) values(auth.uid(),'refund',abs(v_debit.amount),v_balance,'refund:'||p_reference,p_note);
  return v_balance;
end; $$;

-- Existing accounts receive the same one-time welcome balance if they have no wallet.
insert into public.coin_wallets(user_id,balance,lifetime_earned)
select id,60,60 from public.profiles on conflict(user_id) do nothing;
insert into public.coin_ledger(user_id,tx_type,amount,balance_after,note)
select user_id,'welcome',60,60,'Welcome bonus (wallet migration)' from public.coin_wallets
where lifetime_earned=60 and lifetime_spent=0 and not exists(select 1 from public.coin_ledger l where l.user_id=coin_wallets.user_id);

-- Permissions: RPCs are security definer. Revoke direct table inserts/updates from users.
revoke insert, update, delete on public.coin_wallets from public, anon, authenticated;
revoke insert, update, delete on public.coin_ledger from public, anon, authenticated;
revoke insert, update, delete on public.coin_payments from public, anon, authenticated;
grant select on public.coin_wallets to authenticated;
grant select on public.coin_ledger to authenticated;
grant select on public.coin_payments to authenticated;
revoke all on function public.credit_coins(uuid,integer,public.coin_tx_type,text,text) from public,anon,authenticated;
revoke all on function public.verify_coin_purchase(uuid,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.debit_coins(uuid,integer,public.coin_tx_type,text,text) to authenticated;
grant execute on function public.refund_failed_ai_charge(text,text) to authenticated;
grant execute on function public.admin_adjust_coins(uuid,uuid,integer,text) to authenticated;
grant execute on function public.admin_coin_overview() to authenticated;

commit;
