-- Run in a transaction and roll back. Synthetic admin/customer records only.
insert into auth.users(id,email,raw_user_meta_data) values
('a1800000-0000-4000-8000-000000000001','training-admin@example.invalid','{}'),
('a1800000-0000-4000-8000-000000000002','training-user@example.invalid','{}');
insert into public.user_roles(user_id,role) values('a1800000-0000-4000-8000-000000000001','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000001',true);
insert into public.ai_training_documents(id,uploaded_by,filename,object_path,content_hash,extraction)
values('a1800000-0000-4000-8000-000000000003',auth.uid(),'synthetic.pdf',auth.uid()::text||'/synthetic.pdf','synthetic-hash','{}');
insert into storage.objects(bucket_id,name) values('ai-training-quotations',auth.uid()::text||'/synthetic.pdf');
do $$ begin
  if not exists(select 1 from public.ai_training_documents where id='a1800000-0000-4000-8000-000000000003') then raise exception 'Admin read failed'; end if;
  begin
    perform public.review_ai_training('a1800000-0000-4000-8000-000000000003','approve','{}',false);
    raise exception 'Approval without review allowed';
  exception when others then
    if sqlerrm='Approval without review allowed' then raise; end if;
  end;
end $$;
select public.review_ai_training('a1800000-0000-4000-8000-000000000003','approve',
  jsonb_build_object('location','Bengaluru','currency','INR','priceDate',current_date::text,'projectType','Apartment',
    'items',jsonb_build_array(jsonb_build_object('section','Bedroom','productName','Synthetic wardrobe','material','Laminate',
      'specification','Synthetic specification','unit','sqft','rate',1200,'tax','excluded','installationIncluded',true,'page',1,'notes','Synthetic'))),true);
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000002',true);
do $$ declare affected integer; begin
  if exists(select 1 from public.ai_training_documents where id='a1800000-0000-4000-8000-000000000003') then raise exception 'Customer raw extraction read allowed'; end if;
  if exists(select 1 from storage.objects where bucket_id='ai-training-quotations') then raise exception 'Customer training PDF read allowed'; end if;
  if not exists(select 1 from public.ai_training_patterns where document_id='a1800000-0000-4000-8000-000000000003') then raise exception 'Approved reference not visible'; end if;
  update public.ai_training_patterns set rate=1 where document_id='a1800000-0000-4000-8000-000000000003';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Customer changed approved global rate'; end if;
  begin
    perform public.review_ai_training('a1800000-0000-4000-8000-000000000003','reject','{}',false);
    raise exception 'Customer review allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('ai-training-quotations',auth.uid()::text||'/foreign.pdf');
    raise exception 'Customer training upload allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000001',true);
select public.review_ai_training('a1800000-0000-4000-8000-000000000003','reject','{}',false);
select set_config('request.jwt.claim.sub','a1800000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.ai_training_patterns where document_id='a1800000-0000-4000-8000-000000000003') then raise exception 'Rejected reference still visible'; end if;
end $$;
reset role;
do $$ declare tab text; begin
  foreach tab in array array['ai_training_documents','ai_training_patterns'] loop
    if has_table_privilege('anon','public.'||tab,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Anonymous access to %',tab; end if;
    if has_table_privilege('authenticated','public.'||tab,'TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Browser administration privilege on %',tab; end if;
  end loop;
  if not exists(select 1 from storage.buckets where id='ai-training-quotations' and not public and file_size_limit=10485760) then raise exception 'Training bucket not private'; end if;
end $$;
