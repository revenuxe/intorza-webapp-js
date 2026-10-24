-- Fixed AI prices, serialized wallet updates, and idempotent charge references.
create or replace function public.debit_coins(
  p_user uuid, p_amount integer, p_type public.coin_tx_type,
  p_reference text default null, p_note text default ''
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_balance integer;
  v_existing public.coin_ledger;
begin
  if auth.uid() is null or p_user is null then
    raise exception 'Wallet access denied' using errcode='42501';
  end if;
  if p_type is null or p_type not in ('floor_plan','ai_builder','admin_debit') then
    raise exception 'Invalid debit type';
  end if;
  if p_type = 'admin_debit' then
    if not coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false) then
      raise exception 'Admin access required' using errcode='42501';
    end if;
  elsif p_user <> auth.uid() then
    raise exception 'Wallet access denied' using errcode='42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Debit amount must be positive'; end if;
  if (p_type = 'floor_plan' and p_amount <> 40) or (p_type = 'ai_builder' and p_amount <> 20) then
    raise exception 'Invalid AI coin price';
  end if;
  if p_type in ('floor_plan','ai_builder') and
    (p_reference is null or length(trim(p_reference)) = 0 or length(p_reference) > 200) then
    raise exception 'AI charge reference is required';
  end if;

  -- Lock before checking references so concurrent calls cannot charge twice.
  select balance into v_balance from public.coin_wallets where user_id = p_user for update;
  if not found then raise exception 'Wallet not found. Please reload the page.'; end if;
  if p_type in ('floor_plan','ai_builder') then
    select * into v_existing from public.coin_ledger
      where user_id = p_user and reference_id = p_reference and tx_type in ('floor_plan','ai_builder')
      order by created_at limit 1;
    if found then
      if v_existing.tx_type <> p_type or v_existing.amount <> -p_amount then
        raise exception 'Charge reference already used for another operation';
      end if;
      return v_balance;
    end if;
  end if;
  if v_balance < p_amount then
    raise exception 'Insufficient coins. You need % coins but have %. Top up to continue.', p_amount, v_balance;
  end if;
  update public.coin_wallets set balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount, updated_at = now()
    where user_id = p_user returning balance into v_balance;
  insert into public.coin_ledger(user_id, tx_type, amount, balance_after, reference_id, note)
    values (p_user, p_type, -p_amount, v_balance, p_reference, p_note);
  return v_balance;
end;
$$;
revoke all on function public.debit_coins(uuid,integer,public.coin_tx_type,text,text) from public, anon;
grant execute on function public.debit_coins(uuid,integer,public.coin_tx_type,text,text) to authenticated;
