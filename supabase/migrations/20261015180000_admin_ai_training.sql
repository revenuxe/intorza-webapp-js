begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ai-training-quotations','ai-training-quotations',false,10485760,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
create policy "Admin training PDF reads" on storage.objects for select to authenticated
using(bucket_id='ai-training-quotations' and public.is_admin());
create policy "Admin training PDF uploads" on storage.objects for insert to authenticated
with check(bucket_id='ai-training-quotations' and public.is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Admin training PDF deletes" on storage.objects for delete to authenticated
using(bucket_id='ai-training-quotations' and public.is_admin());

create table public.ai_training_documents(
  id uuid primary key default gen_random_uuid(), uploaded_by uuid not null references auth.users(id),
  filename text not null, object_path text not null unique, content_hash text not null,
  extraction jsonb not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  unique(uploaded_by,content_hash)
);
alter table public.ai_training_documents enable row level security;
create policy "Admins manage AI training documents" on public.ai_training_documents for all to authenticated
using(public.is_admin()) with check(public.is_admin());
revoke all on public.ai_training_documents from public,anon,authenticated;
grant select,insert,update,delete on public.ai_training_documents to authenticated;

create table public.ai_training_patterns(
  id uuid primary key default gen_random_uuid(), document_id uuid not null references public.ai_training_documents(id) on delete cascade,
  section text not null, product_name text not null, material text not null, specification text not null,
  unit text not null check(unit in ('sqft','sqm','rft','piece','set','lump_sum')),
  rate numeric(14,2) check(rate>=0 and rate<=10000000),
  tax text not null check(tax in ('excluded','included','unknown')), installation_included boolean not null,
  location text not null, currency text not null, price_date date not null, project_type text not null,
  source_page integer not null check(source_page>0), notes text not null,
  approved boolean not null default true, approved_at timestamptz not null default now()
);
alter table public.ai_training_patterns enable row level security;
create policy "Read approved global AI references" on public.ai_training_patterns for select to authenticated
using(approved or public.is_admin());
create policy "Admins manage AI reference patterns" on public.ai_training_patterns for all to authenticated
using(public.is_admin()) with check(public.is_admin());
revoke all on public.ai_training_patterns from public,anon,authenticated;
grant select,insert,update,delete on public.ai_training_patterns to authenticated;
create index ai_training_patterns_lookup on public.ai_training_patterns(location,currency,price_date desc) where approved;

-- Publish reviewed, anonymized entries and change source status atomically.
create function public.review_ai_training(p_id uuid,p_action text,p_extraction jsonb,p_confirm_anonymized boolean)
returns void language plpgsql security invoker set search_path=public as $$
declare entry jsonb; begin
  if not public.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  perform 1 from public.ai_training_documents where id=p_id for update;
  if not found then raise exception 'Training document not found'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid review action'; end if;
  if p_action='approve' and (not coalesce(p_confirm_anonymized,false) or length(trim(p_extraction->>'location'))=0
    or p_extraction->>'priceDate' is null or (p_extraction->>'priceDate')::date>current_date
    or jsonb_typeof(p_extraction->'items')<>'array' or jsonb_array_length(p_extraction->'items') not between 1 and 60)
    then raise exception 'Review location, date, entries and anonymization'; end if;
  delete from public.ai_training_patterns where document_id=p_id;
  if p_action='approve' then
    for entry in select * from jsonb_array_elements(p_extraction->'items') loop
      insert into public.ai_training_patterns(document_id,section,product_name,material,specification,unit,rate,tax,installation_included,location,currency,price_date,project_type,source_page,notes)
      values(p_id,entry->>'section',entry->>'productName',entry->>'material',entry->>'specification',entry->>'unit',
        (entry->>'rate')::numeric,entry->>'tax',(entry->>'installationIncluded')::boolean,
        p_extraction->>'location',p_extraction->>'currency',(p_extraction->>'priceDate')::date,
        p_extraction->>'projectType',(entry->>'page')::integer,entry->>'notes');
    end loop;
  end if;
  update public.ai_training_documents set status=case when p_action='approve' then 'approved' else 'rejected' end,
    extraction=p_extraction,reviewed_at=now() where id=p_id;
end $$;
revoke all on function public.review_ai_training(uuid,text,jsonb,boolean) from public,anon;
grant execute on function public.review_ai_training(uuid,text,jsonb,boolean) to authenticated;
commit;
