-- Synthetic users only. All data, jobs, and template changes roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('f14e93d0-bf5e-4b62-b102-f39a21494d61','save-contract@example.invalid','{"full_name":"Contract check"}'),
 ('f14e93d0-bf5e-4b62-b102-f39a21494d62','save-contract-other@example.invalid','{"full_name":"Other owner"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d61',true);
do $$
declare
 payload jsonb := '{"quotation_number":"CONTRACT-CHECK","quotation_title":"Contract check","project_name":"Contract check","client_name":"Synthetic client","status":"draft","grand_total":100,"sections":[{"id":"local-room","section_name":"Bedroom","items":[{"id":"local-item","product_name":"Wardrobe","amount":100,"specifications":[{"label":"Material","value":"Plywood"}]}]}]}';
 saved jsonb; replay jsonb; edited jsonb; editor jsonb; metadata jsonb; result jsonb;
 qid uuid; project_id uuid; key uuid:=gen_random_uuid(); version integer; rejected boolean;
begin
 saved:=public.save_quotation_checked(null,payload,key,null);
 qid:=(saved->>'id')::uuid;
 if saved->>'version_number'<>'1' or saved#>>'{sections,0,items,0,product_name}'<>'Wardrobe' then raise exception 'Save acknowledgement missing canonical version/items'; end if;
 if saved#>>'{sections,0,id}'='local-room' then raise exception 'Local IDs were not replaced'; end if;
 replay:=public.save_quotation_checked(null,payload,key,null);
 if replay<>saved or (select count(*) from public.quotation_versions where quotation_id=qid)<>1 then raise exception 'Repeated request created another quotation/version'; end if;
 rejected:=false;
 begin perform public.save_quotation_checked(null,payload||'{"grand_total":999}',key,null); exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Request key reused with different content'; end if;
 editor:=public.get_quotation_editor(qid);
 if editor#>>'{sections,0,items,0,specifications,0,value}'<>'Plywood' or editor->>'version_number'<>'1' or editor->>'group_reference_no' is null then raise exception 'Editor contract incomplete'; end if;
 metadata:=public.get_quotation_tier_metadata(qid);
 if metadata#>>'{tiers,0,room_count}'<>'1' or metadata#>>'{tiers,0,item_count}'<>'1' or metadata#>'{tiers,0,snapshot,sections}'<>'[]'::jsonb then raise exception 'Metadata must contain counts without full item snapshots'; end if;
 edited:=public.save_quotation_checked(qid,payload||'{"grand_total":200}',gen_random_uuid(),1);
 if edited->>'version_number'<>'2' or (select count(*) from public.quotation_post_save_jobs where quotation_id=qid)<>1 then raise exception 'Updates did not coalesce optional jobs'; end if;
 replay:=public.save_quotation_checked(null,payload,key,null);
 if replay->>'version_number'<>'1' or replay->>'grand_total'<>'100' then raise exception 'Retry receipt did not return the originally acknowledged version'; end if;
 rejected:=false;
 begin perform public.save_quotation_checked(qid,payload,gen_random_uuid(),1); exception when serialization_failure then rejected:=true; end;
 if not rejected then raise exception 'Stale edit overwrote a newer version'; end if;
 rejected:=false;
 begin perform public.save_quotation_checked(qid,payload||'{"sections":[{"section_name":"Bad","items":[{"product_name":"Bad","amount":"invalid"}]}]}',gen_random_uuid(),2); exception when invalid_text_representation then rejected:=true; end;
 if not rejected or (select max(version_number) from public.quotation_versions where quotation_id=qid)<>2 or (select grand_total from public.quotations where id=qid)<>200 then raise exception 'Malformed update did not roll back'; end if;
 if (select count(*) from public.quotation_save_requests where quotation_id=qid)<>2 then raise exception 'Failed transaction left a receipt'; end if;
 result:=public.process_quotation_jobs(5);
 if result->>'failed'<>'0' or result->>'processed'<>'1' or exists(select 1 from public.quotation_post_save_jobs where quotation_id=qid) then raise exception 'Optional job did not complete: %',result; end if;
 if not exists(select 1 from public.quotation_templates where user_id=auth.uid() and template_name='Contract check' and sections#>>'{0,items,0,productName}'='Wardrobe') then raise exception 'Saved template was not built'; end if;
 if not exists(select 1 from public.quotation_templates where user_id=auth.uid() and template_name='Contract check' and sections#>>'{0,items,0,productDetails}' like '%Material: Plywood%') then raise exception 'Template lost structured specifications'; end if;
 -- A subsequent job updates the same account template rather than duplicating it.
 perform public.save_quotation_checked(qid,payload,gen_random_uuid(),2);
 result:=public.process_quotation_jobs(5);
 if result->>'failed'<>'0' or (select count(*) from public.quotation_templates where user_id=auth.uid() and template_name='Contract check')<>1 then raise exception 'Template update failed: %',result; end if;
 -- AI item IDs, evidence and room links must commit with the quotation.
 insert into public.quotation_plan_projects(user_id,analysis,estimate) values(auth.uid(),'{}','{"draft":{"sections":[{"id":"local-room","items":[{"id":"local-item"}]}]},"evidence":[{"itemId":"local-item"}],"roomSections":[{"sectionId":"local-room"}]}') returning id into project_id;
 edited:=public.save_quotation_checked(null,payload||'{"quotation_number":"CONTRACT-AI"}',gen_random_uuid(),null,project_id);
 select estimate into editor from public.quotation_plan_projects where id=project_id;
 if editor#>>'{draft,sections,0,id}' is distinct from edited#>>'{sections,0,id}' or editor#>>'{draft,sections,0,items,0,id}' is distinct from edited#>>'{sections,0,items,0,id}' or editor#>>'{evidence,0,itemId}' is distinct from edited#>>'{sections,0,items,0,id}' or editor#>>'{roomSections,0,sectionId}' is distinct from edited#>>'{sections,0,id}' then raise exception 'AI identities were not reconciled atomically'; end if;
 if (public.get_quotation_editor((edited->>'id')::uuid))#>>'{plan_project,id}'<>project_id::text then raise exception 'Editor did not restore AI provenance'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d62',true);
 if exists(select 1 from public.quotation_save_requests) or exists(select 1 from public.quotation_post_save_jobs) then raise exception 'Another owner can read receipts/jobs'; end if;
 rejected:=false;
 begin perform public.get_quotation_editor(qid); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-account editor access allowed'; end if;
 rejected:=false;
 begin perform public.get_quotation_tier_metadata(qid); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-account tier metadata allowed'; end if;
 rejected:=false;
 begin perform public.save_quotation_checked(qid,payload,gen_random_uuid(),3); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-account checked save allowed'; end if;
 result:=public.process_quotation_jobs(5);
 if result->>'processed'<>'0' then raise exception 'Processed another owner jobs'; end if;
 perform set_config('request.jwt.claim.sub','f14e93d0-bf5e-4b62-b102-f39a21494d61',true);
 delete from public.quotations where id=qid;
 rejected:=false;
 begin perform public.save_quotation_checked(null,payload,key,null); exception when no_data_found then rejected:=true; end;
 if not rejected then raise exception 'Retry resurrected a deleted quotation'; end if;
 if has_function_privilege('anon','public.save_quotation_checked(uuid,jsonb,uuid,integer,uuid)','execute') or has_function_privilege('authenticated','public.quotation_save_result(uuid,integer)','execute') or has_function_privilege('authenticated','public.remap_saved_ai_quotation(uuid,jsonb,jsonb)','execute') then raise exception 'Private save helper exposed'; end if;
end $$;
select 'PASS: atomic save, exact retry receipts, stale-write rejection, rollback, metadata, templates, AI identity reconciliation, deletion tombstones and owner isolation' as result;
rollback;
