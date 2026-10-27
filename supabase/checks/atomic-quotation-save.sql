-- Synthetic records only; the entire test rolls back, including auth triggers.
begin;
insert into auth.users(id, email, raw_user_meta_data)
values ('f14e93d0-bf5e-4b62-b102-f39a21494d01', 'atomic-save-check@example.invalid', '{"full_name":"Integration check"}');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f14e93d0-bf5e-4b62-b102-f39a21494d01', true);
do $$
declare
  q jsonb;
  qid uuid;
  sid uuid;
  iid uuid;
  gid uuid;
  failed boolean := false;
begin
  q := public.save_quotation(null, '{"quotation_number":"INTEGRATION-ROLLBACK","status":"draft","project_name":"Integration test","client_name":"Synthetic client","sections":[{"section_name":"Kitchen","items":[{"product_name":"Cabinet","amount":100}]}]}'::jsonb);
  qid := (q->>'id')::uuid;
  select id into sid from public.quotation_sections where quotation_id = qid;
  select id into iid from public.quotation_items where section_id = sid;
  if sid is null or iid is null then raise exception 'Nested save failed'; end if;
  insert into public.gallery_images(user_id, image_url, filename)
  values(auth.uid(), 'https://example.invalid/synthetic.png', 'synthetic.png') returning id into gid;
  perform public.save_quotation(qid, jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('id',sid,'section_name','Kitchen','items',jsonb_build_array(jsonb_build_object('id',iid,'product_name','Cabinet','amount',100,'gallery_image_ids',jsonb_build_array(gid)))))));
  if not exists(select 1 from public.quotation_item_images where quotation_item_id = iid and gallery_image_id = gid) then raise exception 'Gallery reference was not saved'; end if;
  perform public.save_quotation(qid, jsonb_build_object('project_name','Updated','sections',jsonb_build_array(jsonb_build_object('id',sid,'section_name','Kitchen','items',jsonb_build_array(jsonb_build_object('id',iid,'product_name','Cabinet','amount',200))))));
  if not exists(select 1 from public.quotation_items where id = iid and amount = 200) then raise exception 'Existing item identity not preserved'; end if;
  begin
    perform public.save_quotation(qid, '{"project_name":"Must rollback","sections":[{"section_name":"Bad","items":[{"amount":"invalid-number"}]}]}');
  exception when invalid_text_representation then failed := true;
  end;
  if not failed then raise exception 'Malformed save should fail'; end if;
  if not exists(select 1 from public.quotations where id = qid and project_name = 'Updated') then raise exception 'Header did not rollback'; end if;
  if not exists(select 1 from public.quotation_items where id = iid and amount = 200) then raise exception 'Items did not rollback'; end if;
  perform set_config('request.jwt.claim.sub', 'f14e93d0-bf5e-4b62-b102-f39a21494d02', true);
  failed := false;
  begin
    perform public.save_quotation(qid, '{"project_name":"Wrong tenant"}');
  exception when insufficient_privilege then failed := true;
  end;
  if not failed then raise exception 'Cross-tenant update should fail'; end if;
end;
$$;
select 'PASS: nested save, gallery references, preserved IDs, rollback, and cross-tenant denial' as result;
rollback;
