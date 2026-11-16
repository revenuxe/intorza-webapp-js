-- Synthetic users only; all records and changes roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d11','versions-check@example.invalid','{"full_name":"Versions check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d12','versions-other@example.invalid','{"full_name":"Other owner"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d11',true);
do $$
declare q jsonb; qid uuid; first_id uuid; second_id uuid; saved jsonb; gid uuid; n integer; failed boolean;
begin
 insert into public.gallery_images(user_id,image_url,filename) values(auth.uid(),'https://example.invalid/version.png','version.png') returning id into gid;
 q := public.save_quotation(null,jsonb_build_object('quotation_number','VERSION-CHECK','project_name','Original','client_name','Client','status','draft','grand_total',200,
   'sections',jsonb_build_array(jsonb_build_object('section_name','Bedroom','items',jsonb_build_array(jsonb_build_object('product_name','Wardrobe','product_details','Cabinet','specifications',jsonb_build_array(jsonb_build_object('label','Material','value','Plywood')),'measurement_unit','Nos','sft_area',2,'rate_per_sft',100,'amount',200,'depth','2 ft','notes','Keep these notes','gallery_image_ids',jsonb_build_array(gid)))))));
 qid := (q->>'id')::uuid;
 select id,snapshot into first_id,saved from public.quotation_versions where quotation_id=qid and version_number=1;
 if saved#>>'{sections,0,items,0,product_name}' <> 'Wardrobe' then raise exception 'Version 1 missing nested item'; end if;
 if saved#>>'{sections,0,items,0,notes}' <> 'Keep these notes' then raise exception 'Optional item notes not saved'; end if;
 perform public.save_quotation(qid,'{"project_name":"Edited","grand_total":500,"sections":[{"section_name":"Kitchen","items":[{"product_name":"Counter","amount":500}]}]}');
 select id into second_id from public.quotation_versions where quotation_id=qid and version_number=2;
 if second_id is null then raise exception 'Edit did not record version 2'; end if;
 perform public.revert_quotation_version(qid,first_id,2);
 if (select count(*) from public.quotation_versions where quotation_id=qid) <> 3 then raise exception 'Revert must preserve old versions and create version 3'; end if;
 if not exists(select 1 from public.quotations where id=qid and project_name='Original' and grand_total=200) then raise exception 'Quotation values not restored'; end if;
 if not exists(select 1 from public.quotation_items i join public.quotation_sections s on s.id=i.section_id
   join public.quotation_item_images im on im.quotation_item_id=i.id where s.quotation_id=qid and s.section_name='Bedroom'
   and i.product_name='Wardrobe' and i.measurement_unit='Nos' and i.notes='Keep these notes' and i.depth='2 ft' and i.specifications='[{"label":"Material","value":"Plywood"}]'::jsonb and im.gallery_image_id=gid) then raise exception 'Nested state/images not restored'; end if;
 failed := false;
 begin perform public.revert_quotation_version(qid,second_id,2); exception when serialization_failure then failed:=true; end;
 if not failed then raise exception 'Stale revert should fail'; end if;
 failed := false;
 begin perform public.save_quotation(qid,'{"project_name":"Should rollback","sections":[{"section_name":"Invalid","items":[{"amount":"invalid"}]}]}'); exception when invalid_text_representation then failed:=true; end;
 if not failed or (select count(*) from public.quotation_versions where quotation_id=qid) <> 3 then raise exception 'Failed saves must not add versions'; end if;
 if not exists(select 1 from public.quotations where id=qid and project_name='Original') then raise exception 'Failed save modified quotation'; end if;
 failed:=false;
 begin update public.quotation_versions set snapshot='{}' where id=first_id; exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'History should be immutable'; end if;
 -- Reverting again can recover the edited state too; nothing was lost.
 perform public.revert_quotation_version(qid,second_id,3);
 if not exists(select 1 from public.quotations where id=qid and project_name='Edited' and grand_total=500) then raise exception 'Could not restore a later saved version'; end if;
 -- Deleted gallery assets must abort the entire restore, not silently drop images.
 delete from public.gallery_images where id=gid;
 failed:=false;
 begin perform public.revert_quotation_version(qid,first_id,4); exception when insufficient_privilege then failed:=true; end;
 if not failed or (select count(*) from public.quotation_versions where quotation_id=qid) <> 4 then raise exception 'Missing images should fail without a new version'; end if;
 if not exists(select 1 from public.quotations where id=qid and project_name='Edited') then raise exception 'Failed revert changed the current quotation'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d12',true);
 if exists(select 1 from public.quotation_versions where quotation_id=qid) then raise exception 'Cross-tenant history visible'; end if;
 failed:=false;
 begin perform public.revert_quotation_version(qid,first_id,4); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Cross-tenant revert allowed'; end if;
 failed:=false;
 begin perform public.record_quotation_version(qid); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'Cross-tenant capture allowed'; end if;
end $$;
select 'PASS: saved versions, complete revert, preserved history, stale checks, rollback, immutable history and tenant isolation' as result;
rollback;
