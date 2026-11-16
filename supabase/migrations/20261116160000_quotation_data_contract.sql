begin;
create table public.quotation_save_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 request_hash text not null,
 quotation_id uuid references public.quotations(id) on delete set null,
 version_number integer not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
create index quotation_save_requests_created_idx on public.quotation_save_requests(created_at);
create index quotation_save_requests_quotation_idx on public.quotation_save_requests(quotation_id);
alter table public.quotation_save_requests enable row level security;
revoke all on public.quotation_save_requests from public,anon,authenticated;
grant select on public.quotation_save_requests to authenticated;
create policy "Owners can read save receipts" on public.quotation_save_requests for select to authenticated using(user_id=auth.uid());

create table public.quotation_post_save_jobs (
 quotation_id uuid primary key references public.quotations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 version_number integer not null,
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 last_error text,
 updated_at timestamptz not null default now()
);
create index quotation_post_save_jobs_ready_idx on public.quotation_post_save_jobs(user_id,next_attempt_at,updated_at,quotation_id);
alter table public.quotation_post_save_jobs enable row level security;
revoke all on public.quotation_post_save_jobs from public,anon,authenticated;
grant select on public.quotation_post_save_jobs to authenticated;
create policy "Owners can read post-save jobs" on public.quotation_post_save_jobs for select to authenticated using(user_id=auth.uid());

create function public.get_quotation_editor(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare quote public.quotations;
begin
 select * into quote from public.quotations where id=p_id and user_id=auth.uid();
 if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
 return to_jsonb(quote) || public.quotation_version_snapshot(p_id) || jsonb_build_object(
  'version_number',(select max(version_number) from public.quotation_versions where quotation_id=p_id),
  'group_reference_no',coalesce((select reference_no from public.quotations where id=quote.tier_parent_id and user_id=auth.uid()),quote.reference_no),
  'item_images',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('quotation_item_id',im.quotation_item_id,'sort_order',im.sort_order) order by im.sort_order,im.id)
    from public.quotation_item_images im join public.gallery_images g on g.id=im.gallery_image_id
    join public.quotation_items i on i.id=im.quotation_item_id join public.quotation_sections s on s.id=i.section_id
    where s.quotation_id=p_id and g.user_id=auth.uid()),'[]'::jsonb),
  'plan_project',(select jsonb_build_object('id',p.id,'estimate',p.estimate) from public.quotation_plan_projects p
    where p.quotation_id=p_id and p.user_id=auth.uid() order by p.updated_at desc,p.id limit 1)
 );
end $$;
revoke all on function public.get_quotation_editor(uuid) from public,anon;
grant execute on function public.get_quotation_editor(uuid) to authenticated;

create function public.get_quotation_tier_metadata(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare root_id uuid;
begin
 select coalesce(tier_parent_id,id) into root_id from public.quotations where id=p_id and user_id=auth.uid();
 if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
 return jsonb_build_object('root_id',root_id,'tiers',(
  select jsonb_agg(jsonb_build_object('id',q.id,'tier_name',q.tier_name,'reference_no',q.reference_no,
   'status',q.status,'grand_total',q.grand_total,
   'room_count',(select count(*) from public.quotation_sections s where s.quotation_id=q.id),
   'item_count',(select count(*) from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=q.id),
   'snapshot',(to_jsonb(q)-array['id','user_id','created_at','updated_at','reference_no','tier_parent_id','tier_name'])||jsonb_build_object('sections','[]'::jsonb))
   order by (q.id=root_id) desc,q.created_at,q.id)
  from public.quotations q where (q.id=root_id or q.tier_parent_id=root_id) and q.user_id=auth.uid()
 ));
end $$;
revoke all on function public.get_quotation_tier_metadata(uuid) from public,anon;
grant execute on function public.get_quotation_tier_metadata(uuid) to authenticated;

-- Reconstruct a stable receipt from the already immutable version snapshot;
-- avoid storing another full quotation/AI estimate in the receipt table.
create function public.quotation_save_result(p_id uuid,p_version integer) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select to_jsonb(q)||v.snapshot||jsonb_build_object('version_number',v.version_number)
 from public.quotations q join public.quotation_versions v on v.quotation_id=q.id and v.version_number=p_version
 where q.id=p_id and q.user_id=auth.uid();
$$;
revoke all on function public.quotation_save_result(uuid,integer) from public,anon,authenticated;

create function public.remap_saved_ai_quotation(p_project_id uuid,p_payload jsonb,p_saved jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
<<ai_remap>>
declare section_map jsonb:='{}'; item_map jsonb:='{}'; s jsonb; i jsonb; si integer:=0; ii integer;
  estimate jsonb; sections jsonb; items jsonb; evidence jsonb; rooms jsonb;
begin
 select p.estimate into estimate from public.quotation_plan_projects p where p.id=p_project_id and p.user_id=auth.uid() for update;
 if not found then raise exception 'AI project not found or access denied' using errcode='42501'; end if;
 for s in select value from jsonb_array_elements(p_payload->'sections') loop
  if coalesce(s->>'id','')<>'' then section_map:=section_map||jsonb_build_object(s->>'id',p_saved#>>array['sections',si::text,'id']); end if;
  ii:=0;
  for i in select value from jsonb_array_elements(s->'items') loop
   if coalesce(i->>'id','')<>'' then item_map:=item_map||jsonb_build_object(i->>'id',p_saved#>>array['sections',si::text,'items',ii::text,'id']); end if;
   ii:=ii+1;
  end loop;
  si:=si+1;
 end loop;
 if jsonb_typeof(estimate#>'{draft,sections}')='array' then
  sections:='[]';
  for s in select value from jsonb_array_elements(estimate#>'{draft,sections}') loop
   items:='[]';
   for i in select value from jsonb_array_elements(s->'items') loop
    items:=items||jsonb_build_array(i||jsonb_build_object('id',coalesce(item_map->> (i->>'id'),i->>'id')));
   end loop;
   sections:=sections||jsonb_build_array(s||jsonb_build_object('id',coalesce(section_map->>(s->>'id'),s->>'id'),'items',items));
  end loop;
  estimate:=jsonb_set(estimate,'{draft,sections}',sections);
 end if;
 if jsonb_typeof(estimate->'evidence')='array' then
  select coalesce(jsonb_agg(e||jsonb_build_object('itemId',coalesce(item_map->>(e->>'itemId'),e->>'itemId')) order by ord),'[]') into evidence
  from jsonb_array_elements(estimate->'evidence') with ordinality a(e,ord);
  estimate:=jsonb_set(estimate,'{evidence}',evidence);
 end if;
 if jsonb_typeof(estimate->'roomSections')='array' then
  select coalesce(jsonb_agg(r||jsonb_build_object('sectionId',coalesce(section_map->>(r->>'sectionId'),r->>'sectionId')) order by ord),'[]') into rooms
  from jsonb_array_elements(estimate->'roomSections') with ordinality a(r,ord);
  estimate:=jsonb_set(estimate,'{roomSections}',rooms);
 end if;
 update public.quotation_plan_projects set estimate=ai_remap.estimate,updated_at=now() where id=p_project_id and user_id=auth.uid();
end $$;
revoke all on function public.remap_saved_ai_quotation(uuid,jsonb,jsonb) from public,anon,authenticated;

create function public.save_quotation_checked(p_id uuid,p_payload jsonb,p_request_id uuid,p_expected_version integer,p_project_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); fingerprint text; receipt public.quotation_save_requests; saved jsonb; result jsonb; version integer;
begin
 if actor is null then raise exception 'Not authenticated' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid save request' using errcode='22023'; end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('id',p_id,'payload',p_payload,'version',p_expected_version,'project',p_project_id)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into receipt from public.quotation_save_requests where user_id=actor and request_id=p_request_id;
 if found then
  if receipt.request_hash<>fingerprint then raise exception 'Save request ID was reused with different content' using errcode='22023'; end if;
  if receipt.quotation_id is null then raise exception 'The saved quotation was deleted' using errcode='P0002'; end if;
  return public.quotation_save_result(receipt.quotation_id,receipt.version_number);
 end if;
 -- Same lock order as the existing AI save: project, root quotation, option.
 if p_project_id is not null then
  perform 1 from public.quotation_plan_projects where id=p_project_id and user_id=actor for update;
  if not found then raise exception 'AI project not found or access denied' using errcode='42501'; end if;
 end if;
 if p_id is not null then
  perform 1 from public.quotations where id=(select coalesce(tier_parent_id,id) from public.quotations where id=p_id and user_id=actor) and user_id=actor for update;
  perform 1 from public.quotations where id=p_id and user_id=actor for update;
  if not found then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
  select max(version_number) into version from public.quotation_versions where quotation_id=p_id;
  if p_expected_version is null or version is distinct from p_expected_version then
   raise exception 'This quotation was changed elsewhere. Reload it before saving; your current editor has been kept.' using errcode='40001';
  end if;
 elsif p_expected_version is not null then raise exception 'New quotations cannot have an existing version' using errcode='22023';
 end if;
 if p_project_id is null then saved:=public.save_quotation(p_id,p_payload);
 else saved:=public.save_ai_quotation(p_id,p_payload,p_project_id); end if;
 select max(version_number) into version from public.quotation_versions where quotation_id=(saved->>'id')::uuid;
 result:=public.quotation_save_result((saved->>'id')::uuid,version);
 if p_project_id is not null then perform public.remap_saved_ai_quotation(p_project_id,p_payload,result); end if;
 insert into public.quotation_save_requests(user_id,request_id,request_hash,quotation_id,version_number)
 values(actor,p_request_id,fingerprint,(saved->>'id')::uuid,version);
 insert into public.quotation_post_save_jobs(quotation_id,user_id,version_number)
 values((saved->>'id')::uuid,actor,version)
 on conflict(quotation_id) do update set version_number=excluded.version_number,attempts=0,next_attempt_at=now(),last_error=null,updated_at=now();
 return result;
end $$;
revoke all on function public.save_quotation_checked(uuid,jsonb,uuid,integer,uuid) from public,anon;
grant execute on function public.save_quotation_checked(uuid,jsonb,uuid,integer,uuid) to authenticated;

-- Durable, coalescing outbox. A failed optional template update never rolls back
-- the quotation save. Login/reconnect/after-save processing can safely retry it.
create function public.process_quotation_jobs(p_limit integer default 5) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
<<job_processor>>
declare actor uuid:=auth.uid(); job public.quotation_post_save_jobs; snapshot jsonb;
 template_id uuid; template_name text; sections jsonb; s jsonb; i jsonb; items jsonb; details text; specs text; processed integer:=0; failed integer:=0;
begin
 if actor is null then raise exception 'Not authenticated' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>10 then raise exception 'Invalid job limit' using errcode='22023'; end if;
 for job in select * from public.quotation_post_save_jobs where user_id=actor and next_attempt_at<=now() order by updated_at,quotation_id limit p_limit for update skip locked loop
  begin
   select v.snapshot into snapshot from public.quotation_versions v join public.quotations q on q.id=v.quotation_id
    where v.quotation_id=job.quotation_id and v.version_number=job.version_number and q.user_id=actor;
   if not found then raise exception 'Saved quotation version unavailable'; end if;
   template_name:=coalesce(nullif(snapshot->>'quotation_title',''),snapshot->>'project_name','Quotation');
   perform pg_advisory_xact_lock(hashtextextended(actor::text||':template:'||template_name,0));
   sections:='[]';
   for s in select value from jsonb_array_elements(snapshot->'sections') loop
    items:='[]';
    for i in select value from jsonb_array_elements(s->'items') loop
     details:=coalesce(i->>'product_details','');
     select string_agg((v->>'label')||': '||(v->>'value'),E'\n' order by ord) into specs
      from jsonb_array_elements(coalesce(i->'specifications','[]'::jsonb)) with ordinality a(v,ord);
     if specs is not null then details:=details||case when details<>'' then E'\n\n' else '' end||E'Specifications:\n'||specs; end if;
     items:=items||jsonb_build_array(jsonb_build_object('id',i->>'id','side',i->>'side','productName',i->>'product_name',
      'productDetails',details,'measurementUnit',coalesce(i->>'measurement_unit','Sq.ft'),
      'widthFt',i->'width_ft','heightFt',i->'height_ft','sftArea',i->'sft_area','ratePerSft',i->'rate_per_sft','amount',i->'amount'));
    end loop;
    sections:=sections||jsonb_build_array(jsonb_build_object('id',s->>'id','title',s->>'section_name','items',items));
   end loop;
   select t.id into template_id from public.quotation_templates t where t.user_id=actor and t.template_name=job_processor.template_name order by t.updated_at desc,t.id limit 1;
   if template_id is null then
    insert into public.quotation_templates(user_id,template_name,category,description,sections)
    values(actor,template_name,'Custom','Auto-saved from quotation: '||coalesce(snapshot->>'client_name',''),sections);
   else
    update public.quotation_templates t set sections=job_processor.sections,
     description='Auto-saved from quotation: '||coalesce(snapshot->>'client_name',''),updated_at=now() where t.id=template_id and t.user_id=actor;
   end if;
   delete from public.quotation_post_save_jobs where quotation_id=job.quotation_id and user_id=actor;
   processed:=processed+1;
  exception when others then
   update public.quotation_post_save_jobs set attempts=attempts+1,last_error=sqlstate,
    next_attempt_at=now()+make_interval(secs=>least(300,30*(attempts+1))),updated_at=now() where quotation_id=job.quotation_id and user_id=actor;
   failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('processed',processed,'failed',failed,'ready',
  (select count(*) from public.quotation_post_save_jobs where user_id=actor and next_attempt_at<=now()));
end $$;
revoke all on function public.process_quotation_jobs(integer) from public,anon;
grant execute on function public.process_quotation_jobs(integer) to authenticated;
notify pgrst, 'reload schema';
commit;
