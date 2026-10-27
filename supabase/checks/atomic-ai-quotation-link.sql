begin;
insert into auth.users(id,email,raw_user_meta_data) values
('a2714000-0000-4000-8000-000000000001','ai-link-owner@example.invalid','{}'),
('a2714000-0000-4000-8000-000000000002','ai-link-other@example.invalid','{}');
insert into public.quotation_plan_projects(id,user_id,analysis,brief,estimate) values
('a2714000-0000-4000-8000-000000000003','a2714000-0000-4000-8000-000000000001','{}','{"scope":"complete"}','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2714000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.save_ai_quotation(null,'{"status":"draft","quotation_number":"FOREIGN"}','a2714000-0000-4000-8000-000000000003');
    raise exception 'Foreign AI project allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a2714000-0000-4000-8000-000000000001',true);
do $$ declare saved jsonb; qid uuid; begin
  saved := public.save_ai_quotation(null,'{"status":"draft","quotation_number":"ATOMIC-AI","client_name":"Synthetic","project_name":"Synthetic","sections":[{"section_name":"Kitchen","items":[{"product_name":"Cabinet","amount":100}]}]}','a2714000-0000-4000-8000-000000000003');
  qid := (saved->>'id')::uuid;
  if not exists(select 1 from public.quotation_plan_projects where id='a2714000-0000-4000-8000-000000000003' and quotation_id=qid) then raise exception 'AI link not saved atomically'; end if;
  perform public.save_ai_quotation(qid,'{"project_name":"Updated"}','a2714000-0000-4000-8000-000000000003');
  begin
    perform public.save_ai_quotation(null,'{"status":"draft","quotation_number":"DUPLICATE-AI"}','a2714000-0000-4000-8000-000000000003');
    raise exception 'AI source reassigned to second quote';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_ai_quotation(qid,'{"project_name":"Must rollback","sections":[{"section_name":"Bad","items":[{"amount":"invalid-number"}]}]}','a2714000-0000-4000-8000-000000000003');
    raise exception 'Invalid save accepted';
  exception when invalid_text_representation then null; end;
  if not exists(select 1 from public.quotations where id=qid and project_name='Updated') then raise exception 'Failed update did not roll back'; end if;
end $$;
reset role;
select 'PASS: atomic AI link, owner update, foreign denial, reassignment denial, rollback' result;
rollback;
