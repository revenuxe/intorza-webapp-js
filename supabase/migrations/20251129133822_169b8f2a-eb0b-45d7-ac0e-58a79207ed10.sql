-- Create profiles table for user data
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  company_name text,
  phone text,
  email text,
  address text,
  gstin text,
  logo_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Create clients table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.clients enable row level security;

create policy "Users can view own clients"
  on public.clients for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on public.clients for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on public.clients for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on public.clients for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create quotations table
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  quotation_number text not null,
  project_name text not null,
  quotation_title text,
  client_name text not null,
  client_address text,
  place_of_project text,
  date_of_proposal date,
  valid_till date,
  warranty text,
  project_type text,
  subtotal numeric(12,2) default 0,
  gst_enabled boolean default false,
  gst_percentage numeric(5,2) default 0,
  gst_amount numeric(12,2) default 0,
  discount_amount numeric(12,2) default 0,
  grand_total numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'converted')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.quotations enable row level security;

create policy "Users can view own quotations"
  on public.quotations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own quotations"
  on public.quotations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own quotations"
  on public.quotations for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own quotations"
  on public.quotations for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create quotation sections table
create table public.quotation_sections (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations(id) on delete cascade not null,
  section_name text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.quotation_sections enable row level security;

create policy "Users can view sections of own quotations"
  on public.quotation_sections for select
  to authenticated
  using (
    exists (
      select 1 from public.quotations
      where quotations.id = quotation_sections.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can insert sections to own quotations"
  on public.quotation_sections for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotations
      where quotations.id = quotation_sections.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can update sections of own quotations"
  on public.quotation_sections for update
  to authenticated
  using (
    exists (
      select 1 from public.quotations
      where quotations.id = quotation_sections.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can delete sections of own quotations"
  on public.quotation_sections for delete
  to authenticated
  using (
    exists (
      select 1 from public.quotations
      where quotations.id = quotation_sections.quotation_id
      and quotations.user_id = auth.uid()
    )
  );

-- Create quotation items table
create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.quotation_sections(id) on delete cascade not null,
  side text,
  product_name text not null,
  product_details text,
  width_ft numeric(10,2),
  height_ft numeric(10,2),
  depth text,
  sft_area numeric(10,2),
  rate_per_sft numeric(10,2),
  amount numeric(12,2),
  notes text,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.quotation_items enable row level security;

create policy "Users can view items of own quotations"
  on public.quotation_items for select
  to authenticated
  using (
    exists (
      select 1 from public.quotation_sections
      join public.quotations on quotations.id = quotation_sections.quotation_id
      where quotation_sections.id = quotation_items.section_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can insert items to own quotations"
  on public.quotation_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quotation_sections
      join public.quotations on quotations.id = quotation_sections.quotation_id
      where quotation_sections.id = quotation_items.section_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can update items of own quotations"
  on public.quotation_items for update
  to authenticated
  using (
    exists (
      select 1 from public.quotation_sections
      join public.quotations on quotations.id = quotation_sections.quotation_id
      where quotation_sections.id = quotation_items.section_id
      and quotations.user_id = auth.uid()
    )
  );

create policy "Users can delete items of own quotations"
  on public.quotation_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.quotation_sections
      join public.quotations on quotations.id = quotation_sections.quotation_id
      where quotation_sections.id = quotation_items.section_id
      and quotations.user_id = auth.uid()
    )
  );

-- Create invoices table
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quotation_id uuid references public.quotations(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  invoice_number text not null,
  project_name text not null,
  client_name text not null,
  invoice_date date default current_date,
  due_date date,
  total_amount numeric(12,2) not null,
  paid_amount numeric(12,2) default 0,
  remaining_amount numeric(12,2),
  status text default 'unpaid' check (status in ('paid', 'partially_paid', 'unpaid', 'overdue')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.invoices enable row level security;

create policy "Users can view own invoices"
  on public.invoices for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own invoices"
  on public.invoices for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own invoices"
  on public.invoices for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own invoices"
  on public.invoices for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create payments table
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  amount numeric(12,2) not null,
  payment_method text check (payment_method in ('cash', 'upi', 'bank', 'cheque', 'other')),
  payment_date date default current_date,
  notes text,
  created_at timestamp with time zone default now()
);

alter table public.payments enable row level security;

create policy "Users can view payments for own invoices"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can insert payments to own invoices"
  on public.payments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- Function to handle user profile creation on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign user role by default
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add update triggers
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger update_clients_updated_at before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger update_quotations_updated_at before update on public.quotations
  for each row execute function public.handle_updated_at();

create trigger update_invoices_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();