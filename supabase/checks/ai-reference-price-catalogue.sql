-- Run in a transaction after the migration and roll back all synthetic data.
insert into auth.users(id,email,raw_user_meta_data) values
('a2000000-0000-4000-8000-000000000001','catalogue-admin@example.invalid','{}'),
('a2000000-0000-4000-8000-000000000002','catalogue-user@example.invalid','{}');
insert into public.user_roles(user_id,role) values('a2000000-0000-4000-8000-000000000001','admin');
insert into public.ai_training_documents(id,uploaded_by,filename,object_path,content_hash,extraction,status)
select ('a2000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
  'a2000000-0000-4000-8000-000000000001', 'synthetic.pdf','catalogue-test/'||n||'.pdf','catalogue-test-'||n,'{}','approved'
from generate_series(1,122) n;
insert into public.ai_training_patterns(document_id,section,product_name,material,specification,unit,rate,tax,installation_included,location,currency,price_date,project_type,source_page,notes)
select ('a2000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
  'Bedroom','Synthetic catalogue wardrobe','Laminate','18mm board',
  case when n=121 then 'sqm' else 'sqft' end,
  case when n=122 then 100 when n<=60 then 1000 when n=121 then 21527.82 else 2000 end,
  'excluded',true,' Synthetic City ','INR',case when n=122 then current_date-120 else current_date end,'Apartment',1,''
from generate_series(1,122) n;
-- A repeated room must not count as an independent quotation.
insert into public.ai_training_patterns(document_id,section,product_name,material,specification,unit,rate,tax,installation_included,location,currency,price_date,project_type,source_page,notes)
select 'a2000000-0000-4000-8001-000000000001','Bedroom',
  'synthetic catalogue wardrobe','laminate','18mm board','sqft',1000,'excluded',true,'synthetic city','INR',current_date,'Apartment',1,''
from generate_series(1,70);
-- Material variants and pending/unapproved entries must not contaminate prices.
insert into public.ai_training_patterns(document_id,section,product_name,material,specification,unit,rate,tax,installation_included,location,currency,price_date,project_type,source_page,notes,approved) values
('a2000000-0000-4000-8001-000000000001','Bedroom','Synthetic catalogue wardrobe','Acrylic','18mm board','sqft',3000,'excluded',true,'synthetic city','INR',current_date,'Apartment',1,'',true),
('a2000000-0000-4000-8001-000000000001','Bedroom','Synthetic catalogue wardrobe','Laminate','18mm board','sqft',1,'excluded',true,'synthetic city','INR',current_date,'Apartment',1,'',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000002',true);
do $$ declare r record; begin
  select * into r from public.ai_reference_price_catalogue
    where product_name='synthetic catalogue wardrobe' and material='laminate';
  if not found or r.source_count<>122 or r.recent_source_count<>121 or abs(r.recent_rate-2000)>0.01
    or r.recent_low<>1000 or abs(r.recent_high-2000)>0.01 then
    raise exception 'Catalogue aggregation/recency/unit conversion/deduplication failed: %', row_to_json(r);
  end if;
  if (select count(*) from public.ai_reference_price_catalogue where product_name='synthetic catalogue wardrobe')<>2 then
    raise exception 'Material variants merged';
  end if;
  if exists(select 1 from public.ai_training_documents where filename='synthetic.pdf') then
    raise exception 'Private source documents exposed';
  end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.ai_reference_price_catalogue','SELECT') then raise exception 'Anonymous catalogue access'; end if;
  if has_table_privilege('authenticated','public.ai_reference_price_catalogue','INSERT,UPDATE,DELETE') then raise exception 'Catalogue writable'; end if;
end $$;
select 'PASS: all 122 PDFs aggregated, recent median, normalized units, per-document weighting, material separation and RLS' as result;
