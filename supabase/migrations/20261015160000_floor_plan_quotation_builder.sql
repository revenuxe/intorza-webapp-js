-- Reuse Supabase storage; never put customer drawings in a public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotation-floor-plans', 'quotation-floor-plans', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

create policy "Owners read floor plans" on storage.objects for select to authenticated
using (bucket_id='quotation-floor-plans' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners upload floor plans" on storage.objects for insert to authenticated
with check (bucket_id='quotation-floor-plans' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners delete floor plans" on storage.objects for delete to authenticated
using (bucket_id='quotation-floor-plans' and (storage.foldername(name))[1]=auth.uid()::text);

create table public.quotation_plan_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quotation_id uuid references public.quotations(id) on delete set null,
  files jsonb not null default '[]', analysis jsonb not null,
  brief jsonb, estimate jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.quotation_plan_projects enable row level security;
create policy "Owners manage plan projects" on public.quotation_plan_projects for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid() and
  (quotation_id is null or exists(select 1 from public.quotations q where q.id=quotation_id and q.user_id=auth.uid())));
create index quotation_plan_projects_owner on public.quotation_plan_projects(user_id, created_at desc);

-- Explicitly approved rates, distinct from automatically learned historical patterns.
create table public.quotation_approved_rates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null, specification text not null default '',
  rate numeric(14,2) not null check(rate>=0),
  unit text not null check(unit in ('sqft','rft','piece','set','lump_sum')),
  currency text not null default 'INR', location text not null default '',
  source_url text, inclusions text not null default 'Inclusions require confirmation',
  verified_at timestamptz not null default now(), active boolean not null default true
);
alter table public.quotation_approved_rates enable row level security;
create policy "Owners manage approved rates" on public.quotation_approved_rates for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create index quotation_approved_rates_owner on public.quotation_approved_rates(user_id) where active;
-- Supabase's default ACL can grant TRUNCATE/TRIGGER/REFERENCES to browser roles.
-- Reset inherited defaults before granting only the required data operations.
revoke all on public.quotation_plan_projects, public.quotation_approved_rates from public, anon, authenticated;
grant select, insert, update, delete on public.quotation_plan_projects, public.quotation_approved_rates to authenticated;
