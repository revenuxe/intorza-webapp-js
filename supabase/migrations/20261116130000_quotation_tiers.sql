begin;
alter table public.quotations
  add column tier_parent_id uuid references public.quotations(id) on delete cascade,
  add column tier_name text check (tier_name is null or length(btrim(tier_name)) between 1 and 40);
create index quotations_tier_parent_idx on public.quotations(tier_parent_id);
create unique index quotations_tier_name_unique on public.quotations
  (coalesce(tier_parent_id,id),lower(btrim(tier_name))) where tier_name is not null;

create function public.enforce_quotation_tier() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare parent public.quotations;
begin
 if tg_op='UPDATE' and new.tier_parent_id is distinct from old.tier_parent_id then
   raise exception 'A tier cannot be moved to another quotation';
 end if;
 if new.tier_parent_id is not null then
   select * into parent from public.quotations where id=new.tier_parent_id and user_id=new.user_id and tier_parent_id is null;
   if not found or parent.tier_name is null or new.id=new.tier_parent_id then
     raise exception 'Quotation group not found or access denied' using errcode='42501';
   end if;
   if new.tier_name is null then raise exception 'Choose a tier name'; end if;
   -- Shared client details are canonical on the parent, including during revert.
   new.client_id:=parent.client_id; new.client_name:=parent.client_name; new.client_address:=parent.client_address;
 end if;
 if tg_op='UPDATE' and new.tier_parent_id is null and new.tier_name is null
   and exists(select 1 from public.quotations where tier_parent_id=new.id) then
   raise exception 'The original tier needs a name while other tiers exist';
 end if;
 return new;
end $$;
revoke all on function public.enforce_quotation_tier() from public,anon,authenticated;
create trigger enforce_quotation_tier before insert or update on public.quotations for each row execute function public.enforce_quotation_tier();

create function public.sync_quotation_tier_client() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.tier_parent_id is null and row(new.client_id,new.client_name,new.client_address)
   is distinct from row(old.client_id,old.client_name,old.client_address) then
   update public.quotations set client_id=new.client_id,client_name=new.client_name,client_address=new.client_address
   where tier_parent_id=new.id and user_id=new.user_id;
 end if;
 return new;
end $$;
revoke all on function public.sync_quotation_tier_client() from public,anon,authenticated;
create trigger sync_quotation_tier_client after update on public.quotations for each row execute function public.sync_quotation_tier_client();

-- Group membership and tier labels are managed separately from saved content.
-- Old versions must not detach a tier or remove its label when restored.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.quotation_version_snapshot(uuid)'::regprocedure);
 definition:=replace(definition,'''reference_no''','''reference_no'',''tier_parent_id'',''tier_name''');
 execute definition;
 definition:=pg_get_functiondef('public.save_quotation(uuid,jsonb)'::regprocedure);
 if position('  if p_id is not null then perform public.record_quotation_version(p_id, true); end if;' in definition)=0 then
   raise exception 'Install quotation versions before quotation tiers';
 end if;
 definition:=replace(definition,'  if p_id is not null then perform public.record_quotation_version(p_id, true); end if;',
 '  if p_id is not null then
    perform 1 from public.quotations where id=(select coalesce(tier_parent_id,id) from public.quotations where id=p_id and user_id=auth.uid()) and user_id=auth.uid() for update;
    perform public.record_quotation_version(p_id, true);
  end if;');
 execute definition;
end $$;

create function public.get_quotation_tiers(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare root_id uuid;
begin
 select coalesce(tier_parent_id,id) into root_id from public.quotations where id=p_id and user_id=auth.uid();
 if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
 return jsonb_build_object('root_id',root_id,'tiers',(
   select jsonb_agg(jsonb_build_object('id',q.id,'tier_name',q.tier_name,'reference_no',q.reference_no,
     'status',q.status,'grand_total',q.grand_total,'snapshot',public.quotation_version_snapshot(q.id))
     order by (q.id=root_id) desc,q.created_at,q.id)
   from public.quotations q where (q.id=root_id or q.tier_parent_id=root_id) and q.user_id=auth.uid()
 ));
end $$;
revoke all on function public.get_quotation_tiers(uuid) from public,anon;
grant execute on function public.get_quotation_tiers(uuid) to authenticated;

create function public.name_quotation_tier(p_id uuid,p_name text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_name is null or length(btrim(p_name)) not between 1 and 40 then raise exception 'Use a tier name between 1 and 40 characters'; end if;
 perform 1 from public.quotations where id=(select coalesce(tier_parent_id,id) from public.quotations where id=p_id and user_id=auth.uid()) and user_id=auth.uid() for update;
 update public.quotations set tier_name=btrim(p_name) where id=p_id and user_id=auth.uid();
 if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
end $$;
revoke all on function public.name_quotation_tier(uuid,text) from public,anon;
grant execute on function public.name_quotation_tier(uuid,text) to authenticated;

create function public.create_quotation_tier(p_source_id uuid,p_name text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare root_id uuid; content jsonb; saved jsonb;
begin
 if p_name is null or length(btrim(p_name)) not between 1 and 40 then raise exception 'Use a tier name between 1 and 40 characters'; end if;
 select coalesce(tier_parent_id,id) into root_id from public.quotations where id=p_source_id and user_id=auth.uid();
 if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
 perform 1 from public.quotations where id=root_id and user_id=auth.uid() and tier_name is not null for update;
 if not found then raise exception 'Choose a name for the original tier first'; end if;
 -- Lock the source after the root so copying cannot mix two concurrent saves.
 perform 1 from public.quotations where id=p_source_id and user_id=auth.uid() for update;
 -- Read current content through the owner-checked API, including shared client edits.
 select t->'snapshot' into content from jsonb_array_elements(public.get_quotation_tiers(p_source_id)->'tiers') t where t->>'id'=p_source_id::text;
 content:=content || jsonb_build_object('tier_parent_id',root_id,'tier_name',btrim(p_name),
   'quotation_number','QT-'||gen_random_uuid()::text,'status','draft');
 saved:=public.save_quotation(null,content);
 return saved;
end $$;
revoke all on function public.create_quotation_tier(uuid,text) from public,anon;
grant execute on function public.create_quotation_tier(uuid,text) to authenticated;

-- Reverts acquire locks in the same group-first order as regular saves.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.revert_quotation_version(uuid,uuid,integer)'::regprocedure);
 definition:=replace(definition,'  perform 1 from public.quotations where id = p_id and user_id = auth.uid() for update;',
 '  perform 1 from public.quotations where id=(select coalesce(tier_parent_id,id) from public.quotations where id=p_id and user_id=auth.uid()) and user_id=auth.uid() for update;
  perform 1 from public.quotations where id = p_id and user_id = auth.uid() for update;');
 execute definition;
end $$;
commit;
