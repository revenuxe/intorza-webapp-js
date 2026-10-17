begin;
create or replace function public.delete_client_records(p_client_id uuid, p_client_name text, p_quotation_ids uuid[], p_invoice_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_unique_name boolean;
  v_quotes uuid[];
  v_invoices uuid[];
begin
  if v_user is null or not public.is_pro_user(v_user) then raise exception 'Pro access is required to manage clients.'; end if;
  if p_client_name is null then raise exception 'Client identity is required.'; end if;
  -- Serialize duplicate delete requests, then lock the exact previewed parent rows.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || coalesce(p_client_id::text, p_client_name), 0));
  if p_client_id is not null then
    perform 1 from public.clients where id=p_client_id and user_id=v_user and name=p_client_name for update;
    if not found then raise exception 'Client changed or is not available. Reload the client list.'; end if;
  end if;
  select count(*)=1 into v_unique_name from public.clients where user_id=v_user and name=p_client_name;
  perform 1 from public.quotations where user_id=v_user and
    (client_id=p_client_id or (client_id is null and client_name=p_client_name and (p_client_id is null or v_unique_name))) for update;
  select coalesce(array_agg(id order by id), '{}') into v_quotes from public.quotations where user_id=v_user and
    (client_id=p_client_id or (client_id is null and client_name=p_client_name and (p_client_id is null or v_unique_name)));
  perform 1 from public.invoices where user_id=v_user and
    (client_id=p_client_id or (client_id is null and (quotation_id=any(v_quotes) or (client_name=p_client_name and (p_client_id is null or v_unique_name)
      and not exists(select 1 from public.quotations q where q.id=invoices.quotation_id and q.user_id=v_user))))) for update;
  select coalesce(array_agg(id order by id), '{}') into v_invoices from public.invoices where user_id=v_user and
    (client_id=p_client_id or (client_id is null and (quotation_id=any(v_quotes) or (client_name=p_client_name and (p_client_id is null or v_unique_name)
      and not exists(select 1 from public.quotations q where q.id=invoices.quotation_id and q.user_id=v_user)))));
  if v_quotes is distinct from array(select distinct unnest(coalesce(p_quotation_ids,'{}')) order by 1)
    or v_invoices is distinct from array(select distinct unnest(coalesce(p_invoice_ids,'{}')) order by 1) then
    raise exception 'Client records changed. Reopen the client and review the documents before deleting.';
  end if;
  if p_client_id is null and cardinality(v_quotes)+cardinality(v_invoices)=0 then raise exception 'No client records remain. Reload the list.'; end if;
  -- Existing foreign keys cascade quotation sections/items and invoice payments.
  delete from public.invoices where user_id=v_user and id=any(v_invoices);
  delete from public.quotations where user_id=v_user and id=any(v_quotes);
  if p_client_id is not null then delete from public.clients where user_id=v_user and id=p_client_id; end if;
  return jsonb_build_object('quotations', cardinality(v_quotes), 'invoices', cardinality(v_invoices));
end;
$$;
revoke all on function public.delete_client_records(uuid,text,uuid[],uuid[]) from public, anon;
grant execute on function public.delete_client_records(uuid,text,uuid[],uuid[]) to authenticated;
commit;
