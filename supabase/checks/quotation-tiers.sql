begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d31','tiers-check@example.invalid','{"full_name":"Tier check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d32','tiers-other@example.invalid','{"full_name":"Other owner"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d31',true);
do $$
declare root jsonb; luxury jsonb; custom_tier jsonb; root_id uuid; child_id uuid; version_id uuid; first_version uuid; gid uuid; group_data jsonb; failed boolean;
begin
 insert into public.gallery_images(user_id,image_url,filename) values(auth.uid(),'https://example.invalid/tier.png','tier.png') returning id into gid;
 root:=public.save_quotation(null,jsonb_build_object('quotation_number','TIER-CHECK','project_name','Bedroom','client_name','Shared client','client_address','Old address','status','draft','grand_total',100,
 'sections',jsonb_build_array(jsonb_build_object('section_name','Bedroom','items',jsonb_build_array(jsonb_build_object('product_name','Wardrobe','sft_area',1,'rate_per_sft',100,'amount',100,'specifications',jsonb_build_array(jsonb_build_object('label','Material','value','Plywood')),'gallery_image_ids',jsonb_build_array(gid)))))));
 root_id:=(root->>'id')::uuid;
 select id into first_version from public.quotation_versions where quotation_id=root_id and version_number=1;
 failed:=false;
 begin perform public.create_quotation_tier(root_id,'Luxury'); exception when raise_exception then failed:=true; end;
 if not failed then raise exception 'Must name original tier first'; end if;
 perform public.name_quotation_tier(root_id,'Standard');
 luxury:=public.create_quotation_tier(root_id,'Luxury'); child_id:=(luxury->>'id')::uuid;
 if not exists(select 1 from public.quotations where id=child_id and tier_parent_id=root_id and tier_name='Luxury' and status='draft' and client_name='Shared client') then raise exception 'Tier metadata/client not copied'; end if;
 if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id join public.quotation_item_images im on im.quotation_item_id=i.id where s.quotation_id=child_id and i.product_name='Wardrobe' and i.rate_per_sft=100 and im.gallery_image_id=gid) then raise exception 'Items/prices/images not cloned'; end if;
 group_data:=public.get_quotation_tiers(child_id);
 if group_data->>'root_id' <> root_id::text or jsonb_array_length(group_data->'tiers') <> 2 then raise exception 'Tier group incorrect'; end if;
 if (group_data#>'{tiers,0,snapshot}') ? 'tier_parent_id' or (group_data#>'{tiers,0,snapshot}') ? 'tier_name' then raise exception 'Version snapshots must exclude tier identity'; end if;
 failed:=false;
 begin perform public.create_quotation_tier(root_id,' luxury '); exception when unique_violation then failed:=true; end;
 if not failed then raise exception 'Tier names should be unique ignoring case/whitespace'; end if;
 select id into version_id from public.quotation_versions where quotation_id=child_id and version_number=1;
 perform public.save_quotation(child_id,'{"grand_total":300,"sections":[{"section_name":"Bedroom","items":[{"product_name":"Premium Wardrobe","rate_per_sft":300,"amount":300}]}]}');
 if not exists(select 1 from public.quotations where id=root_id and grand_total=100) then raise exception 'Tier edit changed original total'; end if;
 if (select count(*) from public.quotation_versions where quotation_id=root_id) <> 1 or (select count(*) from public.quotation_versions where quotation_id=child_id) <> 2 then raise exception 'Tier version histories not independent'; end if;
 perform public.save_quotation(root_id,'{"client_name":"Updated shared client","client_address":"New address"}');
 if not exists(select 1 from public.quotations where id=child_id and client_name='Updated shared client' and client_address='New address') then raise exception 'Shared client not propagated'; end if;
 perform public.revert_quotation_version(child_id,version_id,2);
 if not exists(select 1 from public.quotations where id=child_id and tier_parent_id=root_id and tier_name='Luxury' and grand_total=100 and client_name='Updated shared client') then raise exception 'Revert changed tier identity or shared client'; end if;
 custom_tier:=public.create_quotation_tier(child_id,'Premium Plus');
 if not exists(select 1 from public.quotations where id=(custom_tier->>'id')::uuid and tier_parent_id=root_id) then raise exception 'Copying a child created a nested group'; end if;
 perform public.revert_quotation_version(root_id,first_version,2);
 if not exists(select 1 from public.quotations where id=root_id and tier_name='Standard') then raise exception 'Old root version removed original tier label'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d32',true);
 failed:=false;
 begin perform public.get_quotation_tiers(root_id); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Cross-tenant group read allowed'; end if;
 failed:=false;
 begin perform public.create_quotation_tier(child_id,'Other'); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Cross-tenant tier creation allowed'; end if;
 failed:=false;
 begin perform public.name_quotation_tier(root_id,'Other'); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Cross-tenant rename allowed'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d31',true);
 delete from public.quotations where id=root_id;
 if exists(select 1 from public.quotations where tier_parent_id=root_id) or exists(select 1 from public.quotation_versions where quotation_id=child_id) then raise exception 'Group delete did not cascade'; end if;
end $$;
select 'PASS: tier naming, full copy, comparison group, independent edits/history, shared client, safe reverts, tenant isolation and cascade delete' as result;
rollback;
