begin;

-- New accounts already receive their 60 welcome coins in the wallet trigger.
-- This timestamp records the one-time in-product claim experience separately.
alter table public.coin_wallets add column if not exists welcome_claimed_at timestamptz;

-- Do not show a newly introduced reward modal to existing accounts.
update public.coin_wallets set welcome_claimed_at = now() where welcome_claimed_at is null;

create or replace function public.claim_welcome_coins()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_balance integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.coin_wallets set welcome_claimed_at = now(), updated_at = now()
    where user_id = auth.uid() and welcome_claimed_at is null
    returning balance into v_balance;
  if found then return v_balance; end if;
  select balance into v_balance from public.coin_wallets where user_id = auth.uid();
  return v_balance;
end;
$$;

grant execute on function public.claim_welcome_coins() to authenticated;
commit;
