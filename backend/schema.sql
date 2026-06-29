-- =====================================================================
-- Intorza Interior — RDS PostgreSQL Schema
-- Mirrored 1:1 from Supabase `public` schema (auth lives in Supabase).
-- Apply with: psql "$DATABASE_URL" -f backend/schema.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------- ENUM TYPES ----------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE team_member_status AS ENUM ('active','inactive','on_leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE work_type AS ENUM (
    'carpenter','labour','plumber','electrician','painter',
    'mason','welder','supervisor','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------- CORE / PROFILES -----------------------------
-- profiles.id mirrors auth.users(id) from Supabase. No FK (auth is external).
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  full_name text,
  company_name text,
  phone text,
  email text,
  address text,
  gstin text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  professional_advantages text,
  signature_url text,
  payment_stages jsonb DEFAULT '[]'::jsonb,
  terms_conditions jsonb DEFAULT '[]'::jsonb,
  invoice_terms_conditions jsonb DEFAULT '[]'::jsonb,
  bank_name text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_account_holder text,
  upi_id text,
  payment_qr_url text,
  action_count integer DEFAULT 0,
  last_feedback_at timestamptz,
  is_pro boolean DEFAULT false,
  pro_since timestamptz,
  pro_plan text DEFAULT 'monthly',
  pro_expiry timestamptz,
  payment_provider text DEFAULT 'razorpay',
  provider_customer_id text,
  provider_subscription_id text,
  payment_status text DEFAULT 'inactive',
  promo_code text,
  country_code text,
  country_name text,
  currency_code text DEFAULT 'INR',
  currency_symbol text DEFAULT '₹',
  measurement_system text DEFAULT 'metric',
  tax_label text DEFAULT 'GST',
  date_format text DEFAULT 'DD/MM/YYYY',
  number_format text DEFAULT 'indian',
  timezone text DEFAULT 'Asia/Kolkata',
  locale text DEFAULT 'en-IN',
  brand_colors jsonb,
  pdf_heading_font text DEFAULT 'times',
  pdf_body_font text DEFAULT 'helvetica',
  org_code text UNIQUE
);

-- ----------------------- CLIENTS -------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);

-- ----------------------- QUOTATIONS ----------------------------------
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quotation_number text NOT NULL,
  project_name text NOT NULL,
  quotation_title text,
  client_name text NOT NULL,
  client_address text,
  place_of_project text,
  date_of_proposal date,
  valid_till date,
  warranty text,
  project_type text,
  subtotal numeric DEFAULT 0,
  gst_enabled boolean DEFAULT false,
  gst_percentage numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  project_deadline date
);
CREATE INDEX IF NOT EXISTS idx_quotations_user ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);

CREATE TABLE IF NOT EXISTS quotation_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qsections_quotation ON quotation_sections(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES quotation_sections(id) ON DELETE CASCADE,
  side text,
  product_name text NOT NULL,
  product_details text,
  width_ft numeric,
  height_ft numeric,
  depth text,
  sft_area numeric,
  rate_per_sft numeric,
  amount numeric,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qitems_section ON quotation_items(section_id);

CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  filename text NOT NULL,
  title text,
  description text,
  tags text[] DEFAULT '{}',
  category text DEFAULT 'General',
  file_size integer,
  width integer,
  height integer,
  is_favorite boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_images(user_id);

CREATE TABLE IF NOT EXISTS quotation_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_item_id uuid NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
  gallery_image_id uuid NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_item_id, gallery_image_id)
);

-- ----------------------- INVOICES & PAYMENTS -------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  project_name text NOT NULL,
  client_name text NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  total_amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  remaining_amount numeric,
  status text DEFAULT 'unpaid',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation ON invoices(quotation_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text,
  payment_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'razorpay',
  event_type text NOT NULL,
  provider_event_id text UNIQUE,
  amount numeric,
  currency text DEFAULT 'INR',
  status text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  country_code text
);

CREATE TABLE IF NOT EXISTS bank_detail_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  account_holder_name text,
  bank_name text,
  account_number text,
  ifsc_code text,
  upi_id text,
  qr_code_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  country_code text
);

-- ----------------------- TEMPLATES / PREFERENCES ---------------------
CREATE TABLE IF NOT EXISTS quotation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_warranty text DEFAULT '10',
  default_project_type text,
  default_place_of_project text,
  default_gst_enabled boolean DEFAULT false,
  default_gst_rate text DEFAULT '18',
  default_discount_percentage numeric DEFAULT 0,
  default_social_media_discount_enabled boolean DEFAULT false,
  default_social_media_discount_rate numeric DEFAULT 6,
  default_quotation_valid_days integer DEFAULT 7,
  last_warranty text,
  last_project_type text,
  last_place_of_project text,
  last_gst_enabled boolean,
  last_gst_rate text,
  last_discount_percentage numeric,
  last_social_media_discount_enabled boolean,
  last_social_media_discount_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Custom',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_count integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  country_code text
);

CREATE TABLE IF NOT EXISTS terms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL DEFAULT 'quotation',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  country_code text
);

CREATE TABLE IF NOT EXISTS warranty_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_name text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  country_code text
);

CREATE TABLE IF NOT EXISTS item_usage_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  product_details text,
  default_rate numeric,
  preferred_rate numeric,
  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  category text DEFAULT 'General',
  country_code text,
  UNIQUE (user_id, product_name)
);

-- ----------------------- TEAMS ---------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  work_type work_type NOT NULL DEFAULT 'other',
  status team_member_status NOT NULL DEFAULT 'active',
  daily_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id);

CREATE TABLE IF NOT EXISTS team_member_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  work_type text NOT NULL DEFAULT 'other',
  company_id uuid NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  docs_request_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  clock_in_location jsonb,
  clock_out_location jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(team_member_id);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES team_members(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'medium',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------- SITE MEASUREMENT ----------------------------
CREATE TABLE IF NOT EXISTS site_measurement_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_name text NOT NULL,
  site_location text,
  assigned_to uuid REFERENCES team_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  total_area numeric DEFAULT 0,
  room_count integer DEFAULT 0,
  photo_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_measurement_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES site_measurement_projects(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  room_name text,
  width_ft numeric NOT NULL DEFAULT 0,
  length_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric,
  area_sqft numeric,
  notes text,
  pricing_mode text,
  rate_per_sqft numeric,
  lump_sum_amount numeric,
  quantity numeric,
  rate_per_unit numeric,
  final_amount numeric,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES site_measurement_rooms(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------- MISC / META ---------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity(user_id, activity_date);

CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  notes text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  message text,
  trigger_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  feedback_type text DEFAULT 'feedback'
);

-- ----------------------- TRIGGERS: updated_at ------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

DO $$ DECLARE r record; BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='updated_at'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I;
       CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      r.table_name
    );
  END LOOP;
END $$;
