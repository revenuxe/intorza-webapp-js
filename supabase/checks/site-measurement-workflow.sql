-- Synthetic records only. All visits, quotation versions and jobs roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d71','visit-owner@example.invalid','{}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d72','visit-outsider@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d71',true);
do $$
declare visit uuid; missing uuid; qid uuid; first_room uuid; second_room uuid; third_room uuid; payload jsonb; result jsonb; rejected boolean;
begin
 insert into public.site_measurement_projects(user_id,client_name,site_location) values(auth.uid(),'Synthetic visit','Synthetic address') returning id into visit;
 rejected:=false;begin perform public.complete_site_measurement(visit);exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'An empty visit was completed';end if;
 insert into public.site_measurement_rooms(project_id,room_type,width_ft,length_ft,pricing_mode) values(visit,'Kitchen',10,12,'per_sqft') returning id into first_room;
 insert into public.site_measurement_rooms(project_id,room_type,width_ft,length_ft,pricing_mode) values(visit,'Bedroom',8,15,'per_unit') returning id into second_room;
 insert into public.site_measurement_rooms(project_id,room_type,width_ft,length_ft,pricing_mode) values(visit,'Living room',12,20,'lump_sum') returning id into third_room;
 perform public.complete_site_measurement(visit);
 if not exists(select 1 from public.site_measurement_projects where id=visit and status='completed' and total_area=480 and room_count=3)then raise exception 'Visit completion summary incorrect';end if;
 payload:=jsonb_build_array(
  jsonb_build_object('id',first_room,'expected_width_ft',10,'expected_length_ft',12,'pricing_mode','per_sqft','rate_per_sqft',100),
  jsonb_build_object('id',second_room,'expected_width_ft',8,'expected_length_ft',15,'pricing_mode','per_unit','quantity',2,'rate_per_unit',750),
  jsonb_build_object('id',third_room,'expected_width_ft',12,'expected_length_ft',20,'pricing_mode','lump_sum','lump_sum_amount',5000));
 rejected:=false;begin perform public.convert_site_measurement(visit,gen_random_uuid(),jsonb_set(payload,'{0,expected_width_ft}','11'));exception when serialization_failure then rejected:=true;end;
 if not rejected or exists(select 1 from public.quotations where user_id=auth.uid())then raise exception 'Stale measurements created a quotation';end if;
 rejected:=false;begin perform public.convert_site_measurement(visit,gen_random_uuid(),jsonb_set(payload,'{2,lump_sum_amount}','-1'));exception when invalid_parameter_value then rejected:=true;end;
 if not rejected or exists(select 1 from public.site_measurement_rooms where project_id=visit and final_amount is not null)then raise exception 'Failed conversion did not roll back earlier pricing updates';end if;
 result:=public.convert_site_measurement(visit,gen_random_uuid(),payload);
 qid:=(result->>'quotation_id')::uuid;
 if not exists(select 1 from public.quotations where id=qid and status='draft' and grand_total=18500)then raise exception 'Draft total incorrect';end if;
 if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=qid and s.section_name='Kitchen' and i.width_ft=10 and i.height_ft=12 and i.sft_area=120 and i.rate_per_sft=100 and i.amount=12000) then raise exception 'Real room dimensions were lost';end if;
 if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=qid and s.section_name='Bedroom' and i.measurement_unit='Nos' and i.sft_area=2 and i.rate_per_sft=750 and i.amount=1500)then raise exception 'Per-unit pricing not preserved';end if;
 if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id where s.quotation_id=qid and s.section_name='Living room' and i.measurement_unit='L.S.' and i.sft_area=1 and i.rate_per_sft=5000 and i.amount=5000)then raise exception 'Fixed pricing not preserved';end if;
 if not exists(select 1 from public.quotation_versions where quotation_id=qid) or not exists(select 1 from public.quotation_post_save_jobs where quotation_id=qid)then raise exception 'Conversion bypassed normal history/outbox';end if;
 if (public.convert_site_measurement(visit,gen_random_uuid(),payload)->>'quotation_id')::uuid<>qid or (select count(*) from public.quotations where user_id=auth.uid())<>1 then raise exception 'Repeat conversion created a duplicate';end if;
 insert into public.site_measurement_projects(user_id,client_name) values(auth.uid(),'No-price visit') returning id into missing;
 insert into public.site_measurement_rooms(project_id,room_type,width_ft,length_ft) values(missing,'Study',5,7) returning id into first_room;
 result:=public.convert_site_measurement(missing,gen_random_uuid(),jsonb_build_array(jsonb_build_object('id',first_room,'expected_width_ft',5,'expected_length_ft',7,'rate_per_sqft',100)),true);
 if not exists(select 1 from public.quotations where id=(result->>'quotation_id')::uuid and grand_total=0)then raise exception 'No-price draft inherited prices';end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d72',true);
 rejected:=false;begin perform public.complete_site_measurement(visit);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Outsider completed visit';end if;
 rejected:=false;begin perform public.convert_site_measurement(visit,gen_random_uuid(),payload);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Outsider obtained linked quotation';end if;
 if has_function_privilege('anon','public.convert_site_measurement(uuid,uuid,jsonb,boolean)','execute') or has_function_privilege('anon','public.complete_site_measurement(uuid)','execute')then raise exception 'Anonymous workflow access';end if;
end $$;
select 'PASS: visit completion, stale detection, atomic rollback, real dimensions, pricing units, no-price drafts, duplicate protection, versions and owner isolation' as result;
rollback;
