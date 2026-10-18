begin;

drop function public.admin_user_directory(text,text,integer);

-- Login identity comes from Auth; profiles.email is the editable PDF contact.
create or replace function public.admin_user_directory(p_search text default '', p_status text default 'all', p_page integer default 0, p_sort text default 'newest')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if not coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_sort is null or p_sort not in ('newest','purchase') then raise exception 'Invalid sort'; end if;
  if p_status not in ('all','active','inactive') or p_status is null or p_page is null or p_page < 0 then raise exception 'Invalid directory filters'; end if;
  with directory as (
    select p.id,u.email as login_email,p.email as quotation_email,p.full_name,p.company_name,p.phone,
      (select max(l.created_at) from public.payment_logs l where l.user_id=p.id and l.status='captured' and l.event_type='pro_activation') as last_pro_purchase,
      p.created_at,u.last_sign_in_at,p.pro_plan,p.pro_since,p.pro_expiry,p.payment_status,
      coalesce(p.is_pro,false) and (p.pro_expiry is null or p.pro_expiry > now()) as pro_active
    from public.profiles p join auth.users u on u.id=p.id
    where coalesce(p_search,'')='' or strpos(lower(concat_ws(' ',u.email,p.email,p.id::text,p.full_name,p.company_name,p.phone)),lower(p_search)) > 0
  ), filtered as (
    select * from directory where p_status='all' or (p_status='active' and pro_active) or (p_status='inactive' and not pro_active)
  ), page as (
    select * from filtered order by case when p_sort='purchase' then last_pro_purchase end desc nulls last,created_at desc nulls last,id limit 25 offset (p_page::bigint*25)
  )
  select jsonb_build_object('total',(select count(*) from filtered),'users',coalesce((
    select jsonb_agg(to_jsonb(x) order by case when p_sort='purchase' then x.last_pro_purchase end desc nulls last,x.created_at desc nulls last,x.id) from (
      select page.*,
        (select count(*) from public.quotations q where q.user_id=page.id) as quotation_count,
        (select count(*) from public.invoices i where i.user_id=page.id) as invoice_count,
        (select coalesce(jsonb_agg(to_jsonb(receipts) order by receipts.created_at desc),'[]'::jsonb) from (
          select l.id,l.created_at,l.amount,l.currency,l.status,l.event_type,l.provider_event_id
          from public.payment_logs l where l.user_id=page.id order by l.created_at desc limit 10
        ) receipts) as payments
      from page
    ) x
  ),'[]'::jsonb)) into result;
  return result;
end; $$;
revoke all on function public.admin_user_directory(text,text,integer,text) from public,anon;
grant execute on function public.admin_user_directory(text,text,integer,text) to authenticated;

create or replace function public.admin_payment_history(p_user uuid,p_page integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false) then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_user is null or p_page is null or p_page<0 then raise exception 'Invalid history filters'; end if;
  return jsonb_build_object('total',(select count(*) from public.payment_logs where user_id=p_user),
    'payments',coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id) from (
      select id,created_at,amount,currency,status,event_type,provider_event_id,provider,
        raw_payload->>'payment_id' as payment_id,raw_payload->>'order_id' as order_id
      from public.payment_logs where user_id=p_user order by created_at desc,id limit 20 offset p_page::bigint*20
    ) page),'[]'::jsonb));
end; $$;
revoke all on function public.admin_payment_history(uuid,integer) from public,anon;
grant execute on function public.admin_payment_history(uuid,integer) to authenticated;

create or replace function public.admin_wallet_directory(p_search text default '',p_page integer default 0)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false) then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_page is null or p_page<0 then raise exception 'Invalid wallet page'; end if;
  return (with wallets as (
    select w.*,u.email as login_email,p.company_name
    from public.coin_wallets w join auth.users u on u.id=w.user_id join public.profiles p on p.id=w.user_id
    where coalesce(p_search,'')='' or strpos(lower(concat_ws(' ',u.email,p.email,w.user_id::text,p.company_name)),lower(p_search))>0
  ) select jsonb_build_object('total',(select count(*) from wallets),'wallets',coalesce((select jsonb_agg(to_jsonb(page) order by page.updated_at desc,page.user_id) from (
    select * from wallets order by updated_at desc,user_id limit 25 offset p_page::bigint*25
  ) page),'[]'::jsonb)));
end; $$;
revoke all on function public.admin_wallet_directory(text,integer) from public,anon;
grant execute on function public.admin_wallet_directory(text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
