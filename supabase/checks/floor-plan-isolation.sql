-- Synthetic records only. Run inside a transaction and ROLLBACK afterward.
insert into auth.users(id,email,raw_user_meta_data) values
('f1000000-0000-4000-8000-000000000001','floor-plan-owner@example.invalid','{}'),
('f1000000-0000-4000-8000-000000000002','floor-plan-other@example.invalid','{}');
insert into public.quotations(id,user_id,quotation_number,project_name,client_name) values
('f1000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000002','FLOOR-PLAN-ROLLBACK','Synthetic project','Synthetic client');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
insert into public.quotation_plan_projects(id,user_id,analysis) values
('f1000000-0000-4000-8000-000000000004',auth.uid(),'{}');
insert into public.quotation_approved_rates(id,user_id,product_name,rate,unit) values
('f1000000-0000-4000-8000-000000000005',auth.uid(),'Synthetic wardrobe',1000,'sqft');
insert into storage.objects(bucket_id,name) values
('quotation-floor-plans','f1000000-0000-4000-8000-000000000001/check.pdf');
do $$ begin
  if not exists(select 1 from public.quotation_plan_projects where id='f1000000-0000-4000-8000-000000000004') then raise exception 'Owner plan read failed'; end if;
  if not exists(select 1 from public.quotation_approved_rates where id='f1000000-0000-4000-8000-000000000005') then raise exception 'Owner rate read failed'; end if;
  if not exists(select 1 from storage.objects where bucket_id='quotation-floor-plans' and name='f1000000-0000-4000-8000-000000000001/check.pdf') then raise exception 'Owner file read failed'; end if;
  begin
    update public.quotation_plan_projects set quotation_id='f1000000-0000-4000-8000-000000000003' where id='f1000000-0000-4000-8000-000000000004';
    raise exception 'Foreign quotation link allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$ declare affected integer; begin
  if exists(select 1 from public.quotation_plan_projects where id='f1000000-0000-4000-8000-000000000004') then raise exception 'Foreign plan read allowed'; end if;
  if exists(select 1 from public.quotation_approved_rates where id='f1000000-0000-4000-8000-000000000005') then raise exception 'Foreign rate read allowed'; end if;
  if exists(select 1 from storage.objects where bucket_id='quotation-floor-plans' and name='f1000000-0000-4000-8000-000000000001/check.pdf') then raise exception 'Foreign file read allowed'; end if;
  update public.quotation_plan_projects set analysis='{"changed":true}' where id='f1000000-0000-4000-8000-000000000004';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Foreign plan update allowed'; end if;
  delete from public.quotation_approved_rates where id='f1000000-0000-4000-8000-000000000005';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Foreign rate delete allowed'; end if;
  begin
    insert into public.quotation_plan_projects(user_id,analysis) values('f1000000-0000-4000-8000-000000000001','{}');
    raise exception 'Foreign owner insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('quotation-floor-plans','f1000000-0000-4000-8000-000000000001/foreign.pdf');
    raise exception 'Foreign file upload allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare tab text; begin
  foreach tab in array array['quotation_plan_projects','quotation_approved_rates'] loop
    if has_table_privilege('anon','public.'||tab,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Anonymous grant on %',tab; end if;
    if has_table_privilege('authenticated','public.'||tab,'TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Browser administration grant on %',tab; end if;
  end loop;
  if not exists(select 1 from storage.buckets where id='quotation-floor-plans' and not public and file_size_limit=10485760 and allowed_mime_types @> array['application/pdf','image/jpeg','image/png','image/webp']) then raise exception 'Private bucket configuration failed'; end if;
end $$;
