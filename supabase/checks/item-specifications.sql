begin;
insert into auth.users(id,email,raw_user_meta_data) values ('dfad1111-1111-4111-8111-111111111111','spec-check@example.invalid','{"full_name":"Specifications check"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','dfad1111-1111-4111-8111-111111111111',true);
do $$
declare q jsonb; qid uuid; sid uuid; iid uuid; details text; specs jsonb; failed boolean;
begin
  q := public.save_quotation(null,'{"quotation_number":"SPEC-ROLLBACK","status":"draft","client_name":"Synthetic client","project_name":"Before","sections":[{"section_name":"Bedroom","items":[{"product_name":"Wardrobe","product_details":"4-door wardrobe","specifications":[{"label":"Material","value":"BWP Plywood"},{"label":"Brand","value":"Century"}],"measurement_unit":"Sq.ft","width_ft":8,"height_ft":7,"sft_area":56,"rate_per_sft":1850,"amount":103600}]}]}'::jsonb);
  qid := (q->>'id')::uuid;
  select id into sid from public.quotation_sections where quotation_id=qid;
  select id, product_details, specifications into iid,details,specs from public.quotation_items where section_id=sid;
  if public.split_item_specifications(details)->>'description' <> '4-door wardrobe' or jsonb_array_length(specs) <> 2 then raise exception 'Structured save failed'; end if;
  if public.split_item_specifications(E'Painting\n\nSpecifications:\nBrand: Asian Paints\nColour / Code: 0954')->'specifications'->1->>'value' <> '0954' then raise exception 'Legacy split lost colour code'; end if;
  if public.split_item_specifications(E'Specifications:\nBrand: Century')->'specifications'->0->>'value' <> 'Century' then raise exception 'Specification-only legacy parsing failed'; end if;
  perform public.save_quotation(qid,jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('id',sid,'section_name','Bedroom','items',jsonb_build_array(jsonb_build_object('id',iid,'product_name','Wardrobe','product_details','Updated by old client'))))));
  if (select jsonb_array_length(specifications) from public.quotation_items where id=iid) <> 2 then raise exception 'Legacy update lost structured fields'; end if;
  failed := false;
  begin
    perform public.save_quotation(qid,jsonb_build_object('project_name','Must rollback','sections',jsonb_build_array(jsonb_build_object('id',sid,'section_name','Bedroom','items',jsonb_build_array(jsonb_build_object('id',iid,'product_name','Wardrobe','specifications','[{"label":"Brand","value":"Century"},{"label":"brand","value":"Other"}]'::jsonb))))));
  exception when others then
    if sqlerrm <> 'Invalid item specifications' then raise; end if;
    failed := true;
  end;
  if not failed or (select project_name from public.quotations where id=qid) <> 'Before' then raise exception 'Invalid save was not atomic'; end if;
  perform public.save_quotation(qid,jsonb_build_object('sections',jsonb_build_array(jsonb_build_object('id',sid,'section_name','Bedroom','items',jsonb_build_array(jsonb_build_object('id',iid,'product_name','Wardrobe','product_details','No specifications','specifications','[]'::jsonb))))));
  if (select specifications from public.quotation_items where id=iid) <> '[]'::jsonb then raise exception 'Explicit clear failed'; end if;
  if public.valid_item_specifications('{"Brand":"Century"}'::jsonb) or public.valid_item_specifications('[{"label":"Brand","value":""}]'::jsonb) then raise exception 'Invalid metadata accepted'; end if;
end $$;
rollback;
select 'Structured specifications save, legacy compatibility, atomic rejection and explicit clear passed' as result;
