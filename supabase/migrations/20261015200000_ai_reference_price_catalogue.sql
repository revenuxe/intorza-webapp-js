begin;

-- Aggregate the entire reviewed library before API pagination. Each source
-- quotation contributes once to each identical specification, avoiding bias
-- from repeated rooms/line items within one PDF. Raw PDFs remain admin-only.
create view public.ai_reference_price_catalogue
with (security_invoker = true, security_barrier = true) as
with per_document as (
  select document_id,
    lower(regexp_replace(trim(product_name), '\s+', ' ', 'g')) as product_name,
    lower(regexp_replace(trim(material), '\s+', ' ', 'g')) as material,
    lower(regexp_replace(trim(specification), '\s+', ' ', 'g')) as specification,
    lower(regexp_replace(trim(location), '\s+', ' ', 'g')) as location,
    upper(trim(currency)) as currency,
    case when unit = 'sqm' then 'sqft' else unit end as unit,
    tax, installation_included,
    min(section) as section, min(project_type) as project_type,
    max(price_date) as price_date,
    percentile_cont(0.5) within group (order by rate / case when unit='sqm' then 10.7639104167 else 1 end) as rate
  from public.ai_training_patterns
  where approved and rate > 0 and price_date <= current_date
  group by document_id, lower(regexp_replace(trim(product_name), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(material), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(specification), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(location), '\s+', ' ', 'g')), upper(trim(currency)),
    case when unit = 'sqm' then 'sqft' else unit end, tax, installation_included
)
select md5(concat_ws('|',product_name,material,specification,location,currency,unit,tax,installation_included)) as id,
  product_name, material, specification, location, currency, unit, tax, installation_included,
  min(section) as section, min(project_type) as project_type,
  max(price_date) as price_date, count(*) as source_count,
  round((percentile_cont(0.5) within group (order by rate))::numeric,2) as median_rate,
  round(min(rate)::numeric,2) as low_rate, round(max(rate)::numeric,2) as high_rate,
  count(*) filter (where price_date >= current_date - 90) as recent_source_count,
  round((percentile_cont(0.5) within group (order by rate) filter (where price_date >= current_date - 90))::numeric,2) as recent_rate,
  round((min(rate) filter (where price_date >= current_date - 90))::numeric,2) as recent_low,
  round((max(rate) filter (where price_date >= current_date - 90))::numeric,2) as recent_high
from per_document
group by product_name,material,specification,location,currency,unit,tax,installation_included;

revoke all on public.ai_reference_price_catalogue from public, anon, authenticated;
grant select on public.ai_reference_price_catalogue to authenticated;
create index ai_training_patterns_comparable on public.ai_training_patterns(currency,lower(location),price_date desc) where approved and rate > 0;
commit;
