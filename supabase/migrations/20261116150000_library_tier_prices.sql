begin;
-- The existing personal-entry JSON stores optional tierPrices.basic/luxury
-- variants. Existing product fields remain Standard; no saved prices are moved.
create function public.apply_library_tier_prices(p_payload jsonb,p_tier_name text) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare tier text:=lower(btrim(p_tier_name)); section jsonb; item jsonb; product jsonb;
  sections jsonb:='[]'; items jsonb; candidates jsonb; rate numeric; subtotal numeric:=0;
  discount numeric; tax numeric; matched integer:=0;
begin
 if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
 if tier not in ('basic','standard','luxury') or tier is null then return p_payload; end if;
 for section in select value from jsonb_array_elements(p_payload->'sections') loop
  items:='[]';
  for item in select value from jsonb_array_elements(section->'items') loop
   with products as (
    select case when tier='standard' then e.data else e.data || (e.data->'tierPrices'->tier) end as data
    from public.library_personal_entries e
    where e.user_id=auth.uid() and e.kind='product' and e.data is not null
      and e.data->>'hidden' is distinct from 'true'
      and (tier='standard' or jsonb_typeof(e.data->'tierPrices'->tier)='object')
      and not exists(select 1 from public.library_personal_entries c where c.user_id=auth.uid() and c.kind='category' and c.entry_id=e.data->>'categoryId' and c.data->>'hidden'='true')
    union all
    select jsonb_build_object('name',p.product_name,'unit','Sq.ft','rate',coalesce(p.preferred_rate,p.default_rate),
      'description',public.split_item_specifications(p.product_details)->>'description',
      'specifications',public.split_item_specifications(p.product_details)->'specifications')
    from public.item_usage_patterns p where tier='standard' and p.user_id=auth.uid()
      and not exists(select 1 from public.library_personal_entries e where e.user_id=auth.uid() and e.entry_id='legacy-'||p.id::text and e.data is not null)
      and not exists(select 1 from public.library_personal_entries c where c.user_id=auth.uid() and c.kind='category' and lower(c.data->>'name')=lower(coalesce(p.category,'Existing library')) and c.data->>'hidden'='true')
   )
   select coalesce(jsonb_agg(data),'[]') into candidates from products
   where lower(btrim(data->>'name'))=lower(btrim(item->>'product_name'))
     and lower(case when data->>'unit'='Litre' then 'Ltr' else coalesce(data->>'unit','Sq.ft') end)=lower(coalesce(item->>'measurement_unit','Sq.ft'))
     and jsonb_typeof(data->'rate')='number'
     and case when jsonb_typeof(data->'rate')='number' then (data->>'rate')::numeric between 0 and 1000000000000 else false end;
   -- Never guess between duplicate names/units, convert units, or replace an
   -- existing price with an unset tier rate. Zero is an explicitly saved rate.
   if jsonb_array_length(candidates)=1 then
    product:=candidates->0; rate:=(product->>'rate')::numeric;
    item:=item || jsonb_build_object('rate_per_sft',rate,'amount',round(coalesce((item->>'sft_area')::numeric,0)*rate,2));
    if public.valid_item_specifications(product->'specifications') then
     item:=item || jsonb_build_object('product_details',coalesce(product->>'description',''),'specifications',product->'specifications');
    end if;
    matched:=matched+1;
   end if;
   subtotal:=subtotal+coalesce((item->>'amount')::numeric,0);
   items:=items || jsonb_build_array(item);
  end loop;
  sections:=sections || jsonb_build_array(section || jsonb_build_object('items',items));
 end loop;
 if matched=0 then return p_payload; end if;
 discount:=least(subtotal,greatest(0,round(case when coalesce((p_payload->>'subtotal')::numeric,0)>0
   then coalesce((p_payload->>'discount_amount')::numeric,0)*subtotal/(p_payload->>'subtotal')::numeric
   else coalesce((p_payload->>'discount_amount')::numeric,0) end,2)));
 tax:=case when coalesce((p_payload->>'gst_enabled')::boolean,false)
   then round((subtotal-discount)*coalesce((p_payload->>'gst_percentage')::numeric,0)/100,2) else 0 end;
 return p_payload || jsonb_build_object('sections',sections,'subtotal',subtotal,'discount_amount',discount,'gst_amount',tax,'grand_total',subtotal-discount+tax);
end $$;
revoke all on function public.apply_library_tier_prices(jsonb,text) from public,anon;
grant execute on function public.apply_library_tier_prices(jsonb,text) to authenticated;

-- Reprice only the newly created copy, inside its existing atomic save. Opening,
-- renaming, switching, editing or reverting a saved tier never runs this helper.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.create_quotation_tier(uuid,text)'::regprocedure);
 if position(' saved:=public.save_quotation(null,content);' in definition)=0 then raise exception 'Unexpected tier creation function'; end if;
 definition:=replace(definition,' saved:=public.save_quotation(null,content);',
   ' content:=public.apply_library_tier_prices(content,p_name);
 saved:=public.save_quotation(null,content);');
 execute definition;
end $$;
commit;
