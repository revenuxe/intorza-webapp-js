-- Synthetic multi-room save/edit/reload check; no customer records changed.
begin;
insert into auth.users(id,email,raw_user_meta_data)
values('f1900000-0000-4000-8000-000000000001','full-scope-save@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1900000-0000-4000-8000-000000000001',true);
do $$ declare sections jsonb; saved jsonb; quote_id uuid; restored jsonb; begin
  select jsonb_agg(jsonb_build_object('section_name','Room '||room,'items',(
    select jsonb_agg(jsonb_build_object('product_name','Product '||room||'-'||item,'product_details','Full specification',
      'width_ft',8,'height_ft',7,'sft_area',56,'rate_per_sft',1200,'amount',67200) order by item)
    from generate_series(1,4) item)) order by room) into sections from generate_series(1,7) room;
  saved := public.save_quotation(null,jsonb_build_object('quotation_number','FULL-SCOPE-ROLLBACK','project_name','Full scope check','client_name','Synthetic customer','sections',sections));
  quote_id := (saved->>'id')::uuid;
  if (select count(*) from public.quotation_sections where quotation_id=quote_id)<>7 then raise exception 'Missing sections after save'; end if;
  if (select count(*) from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=quote_id)<>28 then raise exception 'Missing items after save'; end if;
  select jsonb_agg(jsonb_build_object('id',s.id,'section_name',s.section_name,'items',(
    select jsonb_agg(to_jsonb(i) order by i.sort_order) from public.quotation_items i where i.section_id=s.id)) order by s.sort_order)
    into restored from public.quotation_sections s where s.quotation_id=quote_id;
  perform public.save_quotation(quote_id,jsonb_build_object('project_name','Edited full scope','sections',restored));
  if (select count(*) from public.quotation_sections where quotation_id=quote_id)<>7 then raise exception 'Missing sections after edit'; end if;
  if (select count(*) from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=quote_id)<>28 then raise exception 'Missing items after edit'; end if;
  if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=quote_id and s.section_name='Room 7' and i.product_name='Product 7-4' and i.amount=67200) then raise exception 'Final item content lost'; end if;
end $$;
rollback;
select 'PASS: seven sections and 28 items preserved through save, readback and edit; all synthetic records rolled back' as result;
