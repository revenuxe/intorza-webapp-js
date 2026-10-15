begin;

-- Preserve the deliberate four-column directory without granting profile access.
create or replace view public.companies_public
with (security_barrier = true, security_invoker = false) as
select id, company_name, country_name, org_code from public.profiles
where company_name is not null and company_name <> '';
revoke all on public.companies_public from public, anon, authenticated;
grant select on public.companies_public to anon, authenticated;

-- This bucket contains signatures and payment QR codes, not just public logos.
update storage.buckets set public = false where id = 'company-logos';
drop policy if exists "Logos are publicly accessible" on storage.objects;
create policy "Owners read company assets" on storage.objects
for select to authenticated
using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Restrictive policies also constrain any other permissive storage policies.
create policy "Company asset owner boundary" on storage.objects as restrictive
for all to public
using (bucket_id <> 'company-logos' or
  (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text))
with check (bucket_id <> 'company-logos' or
  (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text));

commit;
