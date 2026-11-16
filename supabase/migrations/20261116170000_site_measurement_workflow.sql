begin;
-- Uses the existing owner/assigned-member RLS policies. Completing a visit does
-- not create a quotation or require prices/photos.
create function public.complete_site_measurement(p_project_id uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
<<completion>>
declare project public.site_measurement_projects; room_count integer; total numeric; photo_count integer;
begin
 if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
 select * into project from public.site_measurement_projects where id=p_project_id for update;
 if not found then raise exception 'Site visit not found or access denied' using errcode='42501'; end if;
 select count(*),coalesce(sum(area_sqft),0) into room_count,total from public.site_measurement_rooms where project_id=p_project_id;
 if room_count=0 or exists(select 1 from public.site_measurement_rooms where project_id=p_project_id and
  (width_ft<=0 or length_ft<=0 or width_ft::text in ('NaN','Infinity','-Infinity') or length_ft::text in ('NaN','Infinity','-Infinity'))) then
  raise exception 'Measure the width and length of every room before finishing the visit' using errcode='22023';
 end if;
 select count(*) into photo_count from public.room_photos p join public.site_measurement_rooms r on r.id=p.room_id where r.project_id=p_project_id;
 update public.site_measurement_projects set status=case when quotation_id is not null then 'converted' else 'completed' end,
  total_area=total,room_count=completion.room_count,photo_count=completion.photo_count,updated_at=now()
 where id=p_project_id returning * into project;
 if not found then raise exception 'Site visit could not be completed' using errcode='42501'; end if;
 return to_jsonb(project);
end $$;
revoke all on function public.complete_site_measurement(uuid) from public,anon;
grant execute on function public.complete_site_measurement(uuid) to authenticated;

-- One site visit links to one quotation. Locking the visit serializes duplicate
-- submissions/retries; pricing, nested quote/history and the link commit together.
create function public.convert_site_measurement(p_project_id uuid,p_request_id uuid,p_pricing jsonb,p_skip_amounts boolean default false) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
<<conversion>>
declare project public.site_measurement_projects; room public.site_measurement_rooms; price jsonb;
 sections jsonb:='[]'; content jsonb; saved jsonb; mode text; rate numeric; quantity numeric; amount numeric;
 subtotal numeric:=0; width numeric; length numeric; unit text; room_count integer; label text; details text;
begin
 if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
 if p_request_id is null or p_skip_amounts is null or jsonb_typeof(p_pricing) is distinct from 'array' then raise exception 'Invalid quotation request' using errcode='22023'; end if;
 select * into project from public.site_measurement_projects where id=p_project_id and user_id=auth.uid() for update;
 if not found then raise exception 'Only the site owner can create its quotation' using errcode='42501'; end if;
 if project.quotation_id is not null then
  if not exists(select 1 from public.quotations where id=project.quotation_id and user_id=auth.uid()) then raise exception 'Linked quotation unavailable' using errcode='42501'; end if;
  return jsonb_build_object('quotation_id',project.quotation_id,'existing',true);
 end if;
 perform 1 from public.site_measurement_rooms where project_id=p_project_id order by id for update;
 select count(*) into room_count from public.site_measurement_rooms where project_id=p_project_id;
 if room_count=0 or jsonb_array_length(p_pricing)<>room_count or
  (select count(distinct value->>'id') from jsonb_array_elements(p_pricing))<>room_count or
  exists(select 1 from jsonb_array_elements(p_pricing) a where not exists(select 1 from public.site_measurement_rooms r where r.id=(a->>'id')::uuid and r.project_id=p_project_id)) then
  raise exception 'The room list changed. Reload this visit before creating its quotation' using errcode='40001';
 end if;
 for room in select * from public.site_measurement_rooms where project_id=p_project_id order by sort_order,id loop
  if room.width_ft<=0 or room.length_ft<=0 or room.width_ft::text in ('NaN','Infinity','-Infinity') or room.length_ft::text in ('NaN','Infinity','-Infinity') then raise exception 'Each room needs a positive width and length' using errcode='22023'; end if;
  select value into price from jsonb_array_elements(p_pricing) where value->>'id'=room.id::text;
  if (price->>'expected_width_ft')::numeric is distinct from room.width_ft or (price->>'expected_length_ft')::numeric is distinct from room.length_ft then
   raise exception 'Room measurements changed. Reload this visit before creating its quotation' using errcode='40001';
  end if;
  mode:=coalesce(price->>'pricing_mode','per_sqft');
  if mode not in ('per_sqft','lump_sum','per_unit') then raise exception 'Invalid room pricing mode' using errcode='22023'; end if;
  width:=0;length:=0;
  if mode='per_sqft' then unit:='Sq.ft';quantity:=room.area_sqft;rate:=coalesce((price->>'rate_per_sqft')::numeric,0);width:=room.width_ft;length:=room.length_ft;
  elsif mode='lump_sum' then unit:='L.S.';quantity:=1;rate:=coalesce((price->>'lump_sum_amount')::numeric,0);
  else unit:='Nos';quantity:=coalesce((price->>'quantity')::numeric,1);rate:=coalesce((price->>'rate_per_unit')::numeric,0);
  end if;
  if quantity<=0 or quantity::text in ('NaN','Infinity','-Infinity') or (not p_skip_amounts and (rate<0 or rate::text in ('NaN','Infinity','-Infinity'))) then raise exception 'Use a positive quantity and a finite non-negative price' using errcode='22023'; end if;
  if p_skip_amounts then rate:=0; end if;
  amount:=quantity*rate;subtotal:=subtotal+amount;
  label:=coalesce(nullif(btrim(room.room_name),''),room.room_type);
  details:='Site floor dimensions: '||room.width_ft||' × '||room.length_ft||' ft. Floor area: '||room.area_sqft||' sq.ft.'||
   case when room.height_ft is not null then ' Ceiling height: '||room.height_ft||' ft.' else '' end||
   E'\nConfirm work scope and billable measurements before sharing this quotation.'||case when coalesce(room.notes,'')<>'' then E'\nSite notes: '||room.notes else '' end;
  sections:=sections||jsonb_build_array(jsonb_build_object('section_name',label,'items',jsonb_build_array(jsonb_build_object(
   'product_name',label||' work','product_details',details,'measurement_unit',unit,'side','A',
   'width_ft',width,'height_ft',length,'sft_area',quantity,'rate_per_sft',rate,'amount',amount))));
  if not p_skip_amounts then
   update public.site_measurement_rooms set pricing_mode=mode,rate_per_sqft=case when mode='per_sqft' then rate else null end,
    lump_sum_amount=case when mode='lump_sum' then rate else null end,quantity=case when mode='per_unit' then conversion.quantity else null end,
    rate_per_unit=case when mode='per_unit' then rate else null end,final_amount=amount,updated_at=now() where id=room.id and project_id=p_project_id;
  end if;
 end loop;
 content:=jsonb_build_object('quotation_number','QT-'||p_request_id::text,'quotation_title',project.client_name,'project_name',project.client_name,
  'client_name',project.client_name,'client_address',coalesce(project.site_location,''),'place_of_project',coalesce(project.site_location,''),
  'status','draft','date_of_proposal',current_date,'gst_enabled',false,'subtotal',subtotal,'grand_total',subtotal,'sections',sections);
 saved:=public.save_quotation_checked(null,content,p_request_id,null);
 update public.site_measurement_projects set quotation_id=(saved->>'id')::uuid,status='converted',room_count=conversion.room_count,
  total_area=(select coalesce(sum(area_sqft),0) from public.site_measurement_rooms where project_id=p_project_id),updated_at=now()
 where id=p_project_id and user_id=auth.uid();
 if not found then raise exception 'Site quotation could not be linked' using errcode='42501'; end if;
 return jsonb_build_object('quotation_id',saved->>'id','existing',false);
end $$;
revoke all on function public.convert_site_measurement(uuid,uuid,jsonb,boolean) from public,anon;
grant execute on function public.convert_site_measurement(uuid,uuid,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
