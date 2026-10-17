-- Synthetic fixtures only. All data and effects roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('c1170000-0000-4000-8000-000000000001','client-delete-owner@example.invalid','{}'),
('c1170000-0000-4000-8000-000000000002','client-delete-other@example.invalid','{}'),
('c1170000-0000-4000-8000-000000000003','client-delete-free@example.invalid','{}');
update public.profiles set is_pro=true, pro_expiry=now()+interval '30 days'
where id in ('c1170000-0000-4000-8000-000000000001','c1170000-0000-4000-8000-000000000002');
insert into public.clients(id,user_id,name) values
('c1170000-0000-4000-8000-000000000011','c1170000-0000-4000-8000-000000000001','Synthetic deletion client'),
('c1170000-0000-4000-8000-000000000012','c1170000-0000-4000-8000-000000000002','Synthetic deletion client');
set local role authenticated;
select set_config('request.jwt.claim.sub','c1170000-0000-4000-8000-000000000001',true);
do $$
declare qid uuid; iid uuid; q jsonb; failed boolean; result jsonb;
begin
  q := public.save_quotation(null,'{"client_id":"c1170000-0000-4000-8000-000000000011","quotation_number":"CLIENT-DELETE-ROLLBACK","project_name":"Synthetic test","client_name":"Synthetic deletion client","sections":[{"section_name":"Kitchen","items":[{"product_name":"Cabinet","amount":100}]}]}');
  qid := (q->>'id')::uuid;
  insert into public.invoices(user_id,client_id,quotation_id,invoice_number,project_name,client_name,total_amount)
    values(auth.uid(),'c1170000-0000-4000-8000-000000000011',qid,'CLIENT-DELETE-ROLLBACK','Synthetic test','Synthetic deletion client',100) returning id into iid;
  insert into public.payments(invoice_id,amount,payment_method) values(iid,30,'cash');
  failed := false;
  begin perform public.delete_client_records('c1170000-0000-4000-8000-000000000011','Synthetic deletion client','{}','{}');
  exception when others then failed := sqlerrm like 'Client records changed%'; end;
  if not failed then raise exception 'Stale preview was not rejected'; end if;
  if not exists(select 1 from public.invoices where id=iid) then raise exception 'Failed delete changed invoices'; end if;
  perform set_config('request.jwt.claim.sub','c1170000-0000-4000-8000-000000000002',true);
  failed := false;
  begin perform public.delete_client_records('c1170000-0000-4000-8000-000000000011','Synthetic deletion client',array[qid],array[iid]);
  exception when others then failed := sqlerrm like 'Client changed%'; end;
  if not failed then raise exception 'Cross-owner client deletion was not rejected'; end if;
  perform set_config('request.jwt.claim.sub','c1170000-0000-4000-8000-000000000003',true);
  failed := false;
  begin perform public.delete_client_records(null,'Synthetic deletion client','{}','{}');
  exception when others then failed := sqlerrm like 'Pro access%'; end;
  if not failed then raise exception 'Free user deletion was not rejected'; end if;
  perform set_config('request.jwt.claim.sub','c1170000-0000-4000-8000-000000000001',true);
  result := public.delete_client_records('c1170000-0000-4000-8000-000000000011','Synthetic deletion client',array[qid],array[iid]);
  if result <> '{"quotations":1,"invoices":1}'::jsonb then raise exception 'Unexpected deletion counts'; end if;
  perform set_config('test.deleted_quote',qid::text,true); perform set_config('test.deleted_invoice',iid::text,true);
  -- Legacy name-only clients also delete through the exact reviewed IDs.
  q := public.save_quotation(null,'{"quotation_number":"CLIENT-LEGACY-ROLLBACK","project_name":"Legacy test","client_name":"Synthetic legacy deletion"}');
  perform public.delete_client_records(null,'Synthetic legacy deletion',array[(q->>'id')::uuid],'{}');
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.payments where invoice_id=current_setting('test.deleted_invoice')::uuid)
    or exists(select 1 from public.quotation_sections where quotation_id=current_setting('test.deleted_quote')::uuid)
    or exists(select 1 from public.clients where id='c1170000-0000-4000-8000-000000000011') then raise exception 'Dependent records did not cascade'; end if;
  if not exists(select 1 from public.clients where id='c1170000-0000-4000-8000-000000000012') then raise exception 'Another owner was changed'; end if;
  if has_function_privilege('anon','public.delete_client_records(uuid,text,uuid[],uuid[])','EXECUTE') then raise exception 'Anonymous deletion permission'; end if;
end $$;
select 'PASS: exact preview, cascade, legacy identity, cross-owner and Pro checks' as result;
rollback;
