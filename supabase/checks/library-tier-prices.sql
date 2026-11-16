begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d51','tier-library@example.invalid','{"full_name":"Tier library check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d52','tier-library-other@example.invalid','{"full_name":"Other check"}');
insert into public.profiles(id,email) values('f14e93d0-bf5e-4b62-b102-f39a21494d51','tier-library@example.invalid') on conflict(id) do nothing;
insert into public.library_personal_entries(user_id,entry_id,kind,revision,data)
select 'f14e93d0-bf5e-4b62-b102-f39a21494d51',v->>'id','product','check',v from jsonb_array_elements('[
 {"id":"wardrobe","name":"Wardrobe","unit":"Sq.ft","rate":100,"tierPrices":{"luxury":{"rate":300,"unit":"Sq.ft","description":"Oak veneer","specifications":[{"label":"Material","value":"Oak"}]},"basic":{"rate":60,"unit":"Sq.ft","description":"Basic plywood","specifications":[]}}},
 {"id":"unset","name":"Unpriced","unit":"Sq.ft","rate":50,"tierPrices":{"luxury":{"rate":null,"unit":"Sq.ft"}}},
 {"id":"unit","name":"Other unit","unit":"Sq.ft","rate":20,"tierPrices":{"luxury":{"rate":500,"unit":"Nos"}}},
 {"id":"free","name":"Free","unit":"Sq.ft","rate":30,"tierPrices":{"luxury":{"rate":0,"unit":"Sq.ft"}}},
 {"id":"dup1","name":"Duplicate","unit":"Sq.ft","tierPrices":{"luxury":{"rate":200,"unit":"Sq.ft"}}},
 {"id":"dup2","name":"Duplicate","unit":"Sq.ft","tierPrices":{"luxury":{"rate":300,"unit":"Sq.ft"}}}
]'::jsonb) v;
insert into public.library_personal_entries(user_id,entry_id,kind,revision,data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d52','foreign','product','check','{"id":"foreign","name":"Foreign","unit":"Sq.ft","tierPrices":{"luxury":{"rate":999,"unit":"Sq.ft"}}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d51',true);
do $$
declare root jsonb; luxury jsonb; basic jsonb; root_id uuid; snapshot jsonb;
begin
 root:=public.save_quotation(null,'{"quotation_number":"LIBRARY-TIER-CHECK","project_name":"Bedroom","client_name":"Client","status":"draft","subtotal":450,"discount_amount":45,"gst_enabled":true,"gst_percentage":18,"gst_amount":72.9,"grand_total":477.9,"sections":[{"section_name":"Bedroom","items":[{"product_name":"Wardrobe","measurement_unit":"Sq.ft","sft_area":2,"rate_per_sft":100,"amount":200},{"product_name":"Unpriced","sft_area":1,"rate_per_sft":50,"amount":50},{"product_name":"Other unit","sft_area":3,"rate_per_sft":20,"amount":60},{"product_name":"Free","sft_area":1,"rate_per_sft":30,"amount":30},{"product_name":"Duplicate","sft_area":1,"rate_per_sft":40,"amount":40},{"product_name":"Foreign","sft_area":1,"rate_per_sft":70,"amount":70}]}]}');
 root_id:=(root->>'id')::uuid;
 perform public.name_quotation_tier(root_id,'Standard');
 luxury:=public.create_quotation_tier(root_id,'Luxury');
 select v.snapshot into snapshot from public.quotation_versions v where quotation_id=(luxury->>'id')::uuid and version_number=1;
 if (snapshot#>>'{sections,0,items,0,rate_per_sft}')::numeric<>300 or (snapshot#>>'{sections,0,items,0,amount}')::numeric<>600 then raise exception 'Configured Luxury rate not applied'; end if;
 if snapshot#>>'{sections,0,items,0,specifications,0,value}'<>'Oak' then raise exception 'Luxury specifications not applied'; end if;
 if (snapshot#>>'{sections,0,items,1,rate_per_sft}')::numeric<>50 then raise exception 'Unset rate should keep copied price'; end if;
 if (snapshot#>>'{sections,0,items,2,rate_per_sft}')::numeric<>20 then raise exception 'Different unit must not replace copied rate'; end if;
 if (snapshot#>>'{sections,0,items,3,rate_per_sft}')::numeric<>0 then raise exception 'Explicit zero rate ignored'; end if;
 if (snapshot#>>'{sections,0,items,4,rate_per_sft}')::numeric<>40 then raise exception 'Duplicate names must not be guessed'; end if;
 if (snapshot#>>'{sections,0,items,5,rate_per_sft}')::numeric<>70 then raise exception 'Another account price leaked'; end if;
 if (snapshot->>'subtotal')::numeric<>820 or (snapshot->>'discount_amount')::numeric<>82 or (snapshot->>'gst_amount')::numeric<>132.84 or (snapshot->>'grand_total')::numeric<>870.84 then raise exception 'Totals/discount/tax not recalculated consistently'; end if;
 if not exists(select 1 from public.quotations where id=root_id and grand_total=477.9) then raise exception 'Original quotation changed'; end if;
 basic:=public.create_quotation_tier(root_id,'Basic');
 if (basic->>'grand_total')::numeric<>392.94 then raise exception 'Basic tier should use Basic price and copied fallback prices'; end if;
 -- Current quotes remain snapshots, even if a library price changes later.
 update public.library_personal_entries set data=jsonb_set(data,'{tierPrices,luxury,rate}','999') where entry_id='wardrobe';
 if not exists(select 1 from public.quotations where id=(luxury->>'id')::uuid and grand_total=870.84) then raise exception 'Library change altered existing tier'; end if;
 if has_function_privilege('anon','public.apply_library_tier_prices(jsonb,text)','EXECUTE') then raise exception 'Anonymous price lookup should be denied'; end if;
end $$;
select 'PASS: tier library matching, copied fallbacks, zero prices, units, ambiguity, account isolation, totals and saved quotation stability' as result;
rollback;
