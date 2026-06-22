-- =============================================================================
--  INTORZA — AWS RDS PostgreSQL schema
--  Source of truth for the application database. Apply with:
--      psql "$DATABASE_URL" -f schema.sql
--
--  Differences vs Supabase original:
--    * No `auth.users` table. We store the Supabase auth user uuid in
--      `user_id` columns but do NOT add a FK — Supabase Auth lives in a
--      different system. Orphan rows are cleaned up by app-level logic.
--    * No RLS policies. Security is enforced by the Express layer via
--      `WHERE user_id = $current_user`. NEVER bypass that.
--    * `gen_random_uuid()` requires pgcrypto.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =============================================================================
--  PROFILES (mirrors a subset of Supabase profile data, owned by RDS now)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid PRIMARY KEY,                 -- = Supabase auth.users.id
  email                text,
  full_name            text,
  company_name         text,
  company_address      text,
  company_phone        text,
  company_email        text,
  company_website      text,
  company_gst          text,
  logo_url             text,
  signature_url        text,
  currency_code        text DEFAULT 'INR',
  country_code         text DEFAULT 'IN',
  heading_font         text,
  body_font            text,
  is_pro               boolean DEFAULT false,
  pro_expiry           timestamptz,
  provider_subscription_id text,
  payment_status       text,
  onboarding_complete  boolean DEFAULT false,
  team_org_code        text,
  customization        jsonb,
  preferences          jsonb,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS user_roles (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL,
  role      app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- =============================================================================
--  CLIENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  name        text NOT NULL,
  email       text,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  QUOTATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS quotations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  quotation_number  text NOT NULL,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name       text NOT NULL,
  client_email      text,
  client_phone      text,
  client_address    text,
  project_location  text,
  project_deadline  date,
  status            quotation_status DEFAULT 'draft',
  subtotal          numeric(14,2) DEFAULT 0,
  gst_percent       numeric(6,2)  DEFAULT 0,
  gst_amount        numeric(14,2) DEFAULT 0,
  total_amount      numeric(14,2) DEFAULT 0,
  notes             text,
  terms             text,
  payment_stages    jsonb,
  customization     jsonb,
  pdf_url           text,
  accepted_at       timestamptz,
  rejected_at       timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotations_user      ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status    ON quotations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_client    ON quotations(client_id);
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS quotation_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id  uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  title         text NOT NULL,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotation_sections_q ON quotation_sections(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id      uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  section_id        uuid REFERENCES quotation_sections(id) ON DELETE SET NULL,
  name              text NOT NULL,
  description       text,
  width             numeric(12,2),
  length            numeric(12,2),
  area              numeric(14,2),
  quantity          numeric(12,2) DEFAULT 1,
  unit              text,
  rate              numeric(14,2) DEFAULT 0,
  discount_percent  numeric(6,2)  DEFAULT 0,
  amount            numeric(14,2) DEFAULT 0,
  sort_order        int DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotation_items_q ON quotation_items(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_item_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
  s3_key      text NOT NULL,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_preferences (
  user_id              uuid PRIMARY KEY,
  default_gst_percent  numeric(6,2) DEFAULT 18,
  default_terms        text,
  default_notes        text,
  default_payment_stages jsonb,
  show_price_per_sqft  boolean DEFAULT true,
  show_area_column     boolean DEFAULT true,
  pdf_theme            text DEFAULT 'minimal',
  brand_primary        text,
  brand_secondary      text,
  preferences          jsonb,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
CREATE TRIGGER trg_qprefs_updated BEFORE UPDATE ON quotation_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  INVOICES & PAYMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  quotation_id    uuid REFERENCES quotations(id) ON DELETE SET NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number  text NOT NULL,
  client_name     text NOT NULL,
  client_email    text,
  client_phone    text,
  client_address  text,
  status          invoice_status DEFAULT 'draft',
  subtotal        numeric(14,2) DEFAULT 0,
  gst_amount      numeric(14,2) DEFAULT 0,
  total_amount    numeric(14,2) DEFAULT 0,
  paid_amount     numeric(14,2) DEFAULT 0,
  due_date        date,
  notes           text,
  terms           text,
  customization   jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  amount      numeric(14,2) NOT NULL,
  method      text,
  reference   text,
  notes       text,
  paid_at     timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS payment_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  provider     text,
  event_type   text,
  reference_id text,
  amount       numeric(14,2),
  currency     text,
  status       text,
  raw_payload  jsonb,
  created_at   timestamptz DEFAULT now()
);

-- =============================================================================
--  TASKS & TEAM
-- =============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,                  -- owner/admin
  member_user_id uuid,                          -- Supabase auth id (nullable)
  name          text NOT NULL,
  email         text,
  phone         text,
  role          text DEFAULT 'member',
  status        text DEFAULT 'active',
  org_code      text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS team_member_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_owner_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  name         text NOT NULL,
  email        text,
  phone        text,
  status       text DEFAULT 'pending',
  message      text,
  responded_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  assigned_to uuid,
  project_id  uuid,
  title       text NOT NULL,
  description text,
  status      task_status DEFAULT 'todo',
  priority    text DEFAULT 'normal',
  due_date    date,
  tags        text[],
  metadata    jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS team_project_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  member_id    uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL,
  project_type text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  member_id    uuid REFERENCES team_members(id) ON DELETE CASCADE,
  date         date NOT NULL,
  clock_in     timestamptz,
  clock_out    timestamptz,
  latitude     numeric(10,6),
  longitude    numeric(10,6),
  notes        text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

-- =============================================================================
--  LIBRARY (templates, terms, items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS terms_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  content     text,
  doc_type    text,                   -- 'quotation' | 'invoice'
  is_default  boolean DEFAULT false,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON terms_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS warranty_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  content     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_detail_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  bank_name     text,
  account_name  text,
  account_number text,
  ifsc          text,
  branch        text,
  upi_id        text,
  qr_s3_key     text,
  is_default    boolean DEFAULT false,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  stages      jsonb NOT NULL,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  items       jsonb NOT NULL,
  category    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  category    text,
  region      text,
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_usage_patterns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  name_normalized text NOT NULL,
  name            text NOT NULL,
  unit            text,
  avg_rate        numeric(14,2),
  last_rate       numeric(14,2),
  usage_count     int DEFAULT 1,
  client_rates    jsonb,
  last_used_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, name_normalized)
);

-- =============================================================================
--  GALLERY & SITE MEASUREMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  s3_key      text NOT NULL,
  title       text,
  description text,
  category    text,
  tags        text[],
  width       int,
  height      int,
  size_bytes  bigint,
  mime_type   text,
  is_public   boolean DEFAULT false,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_images(user_id);

CREATE TABLE IF NOT EXISTS site_measurement_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  client_name     text NOT NULL,
  site_location   text,
  assigned_to     uuid,
  status          text DEFAULT 'active',
  notes           text,
  metadata        jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_measurement_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES site_measurement_projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  room_type   text,
  width       numeric(10,2),
  length      numeric(10,2),
  height      numeric(10,2),
  area        numeric(14,2),
  unit        text DEFAULT 'ft',
  notes       text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_photos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES site_measurement_rooms(id) ON DELETE CASCADE,
  s3_key    text NOT NULL,
  caption   text,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
--  MISC
-- =============================================================================
CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  subject     text,
  message     text NOT NULL,
  rating      int,
  page_url    text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  event_type  text NOT NULL,
  provider    text,
  payload     jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  action      text NOT NULL,
  metadata    jsonb,
  ip_address  inet,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id, created_at DESC);
