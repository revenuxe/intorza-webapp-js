begin;

-- Deliberately public company directory; never expose private profile columns.
create or replace view public.companies_public
with (security_barrier = true, security_invoker = false) as
select id, company_name, country_name, org_code
from public.profiles
where company_name is not null and company_name <> '';
revoke all on public.companies_public from public, anon, authenticated;
grant select on public.companies_public to anon, authenticated;

drop policy if exists "Anyone can view company names" on public.profiles;
create policy "Private profile read boundary" on public.profiles
as restrictive for select to authenticated
using (auth.uid() = id or public.has_role(auth.uid(), 'admin'::public.app_role));
revoke all on public.profiles from public, anon;

-- Row ownership does not restrict columns. Remove table-wide write grants,
-- including insertion of privileged subscription fields into a new profile.
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
do $$
declare c record;
begin
  -- Clear any pre-existing per-column grants before applying the allowlist.
  for c in select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
  loop
    execute format('revoke insert (%I), update (%I), references (%I) on public.profiles from public, anon, authenticated', c.column_name, c.column_name, c.column_name);
  end loop;
end;
$$;
grant select on public.profiles to authenticated;
grant update (
  full_name, company_name, phone, email, address, gstin, logo_url,
  professional_advantages, signature_url, payment_stages, terms_conditions,
  invoice_terms_conditions, bank_name, bank_account_number, bank_ifsc_code,
  bank_account_holder, upi_id, payment_qr_url, action_count, last_feedback_at,
  country_code, country_name, currency_code, currency_symbol, measurement_system,
  tax_label, date_format, number_format, timezone, locale, brand_colors,
  pdf_heading_font, pdf_body_font, org_code, hero_image_url
) on public.profiles to authenticated;
-- Auth's trusted handle_new_user trigger creates profiles; browser insertion
-- is unnecessary. service_role retains its existing privileged grants.

commit;
