-- =============================================================================
--  INTORZA — AWS RDS PostgreSQL schema
--
--  RECONSTRUCTED from the live Supabase schema, using the generated
--  src/integrations/supabase/types.ts (post-all-migrations ground truth) and
--  supabase/migrations/*.sql. Column names/nullability mirror production exactly
--  so that scripts/migrate-data.js (SELECT * → INSERT by column name) copies
--  every row losslessly.
--
--  >>> VERIFY before the real data migration: run a live `pg_dump --schema-only`
--      from Supabase (scripts/migrate-schema.sh) and diff against this file to
--      catch any column made via the dashboard that isn't reflected here, and to
--      confirm exact numeric precision / date-vs-timestamptz choices.
--
--  Differences vs Supabase original (intentional):
--    * No `auth.users` table or FKs to it — Supabase Auth stays separate; we
--      only store the auth user uuid in user_id / company_id columns.
--    * No RLS. Security is the Express layer's `WHERE <owner> = $current_user`.
--    * No storage buckets / triggers tied to auth.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------- Enums ----------
DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE team_member_status AS ENUM ('active','inactive','on_leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE work_type AS ENUM
  ('carpenter','labour','plumber','electrician','painter','mason','welder','supervisor','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =============================================================================
--  PROFILES  (PK = Supabase auth user id; also the "company_id" elsewhere)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                        uuid PRIMARY KEY,
  action_count              integer DEFAULT 0,
  address                   text,
  bank_account_holder       text,
  bank_account_number       text,
  bank_ifsc_code            text,
  bank_name                 text,
  brand_colors              jsonb,
  company_name              text,
  country_code              text,
  country_name              text,
  created_at                timestamptz DEFAULT now(),
  currency_code             text,
  currency_symbol           text,
  date_format               text,
  email                     text,
  full_name                 text,
  gstin                     text,
  invoice_terms_conditions  jsonb,
  is_pro                    boolean DEFAULT false,
  last_feedback_at          timestamptz,
  locale                    text,
  logo_url                  text,
  measurement_system        text,
  number_format             text,
  org_code                  text,
  payment_provider          text,
  payment_qr_url            text,
  payment_stages            jsonb,
  payment_status            text,
  pdf_body_font             text,
  pdf_heading_font          text,
  phone                     text,
  pro_expiry                timestamptz,
  pro_plan                  text,
  pro_since                 timestamptz,
  professional_advantages   text,
  promo_code                text,
  provider_customer_id      text,
  provider_subscription_id  text,
  signature_url             text,
  tax_label                 text,
  terms_conditions          jsonb,
  timezone                  text,
  updated_at                timestamptz DEFAULT now(),
  upi_id                    text
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  role       app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- =============================================================================
--  CLIENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  name       text NOT NULL,
  email      text,
  phone      text,
  address    text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  QUOTATIONS → SECTIONS → ITEMS (note: items belong to a SECTION, not directly
--  to a quotation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS quotations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  client_id        uuid REFERENCES clients(id) ON DELETE SET NULL,
  quotation_number text NOT NULL,
  quotation_title  text,
  client_name      text NOT NULL,
  client_address   text,
  project_name     text NOT NULL,
  project_type     text,
  place_of_project text,
  date_of_proposal date,
  project_deadline date,
  valid_till       date,
  status           text DEFAULT 'draft',
  subtotal         numeric(14,2) DEFAULT 0,
  discount_amount  numeric(14,2) DEFAULT 0,
  gst_enabled      boolean DEFAULT false,
  gst_percentage   numeric(6,2) DEFAULT 0,
  gst_amount       numeric(14,2) DEFAULT 0,
  grand_total      numeric(14,2) DEFAULT 0,
  warranty         text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotations_user   ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS quotation_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotation_sections_q ON quotation_sections(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      uuid NOT NULL REFERENCES quotation_sections(id) ON DELETE CASCADE,
  product_name    text NOT NULL,
  product_details text,
  side            text,
  depth           text,
  width_ft        numeric(12,2),
  height_ft       numeric(12,2),
  sft_area        numeric(14,2),
  rate_per_sft    numeric(14,2),
  amount          numeric(14,2),
  notes           text,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotation_items_section ON quotation_items(section_id);

CREATE TABLE IF NOT EXISTS quotation_item_images (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_item_id uuid NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
  gallery_image_id  uuid NOT NULL,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qii_item ON quotation_item_images(quotation_item_id);

CREATE TABLE IF NOT EXISTS quotation_preferences (
  id                                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                               uuid NOT NULL UNIQUE,
  default_discount_percentage           numeric(6,2),
  default_gst_enabled                   boolean,
  default_gst_rate                      text,
  default_place_of_project              text,
  default_project_type                  text,
  default_quotation_valid_days          integer,
  default_social_media_discount_enabled boolean,
  default_social_media_discount_rate    numeric(6,2),
  default_warranty                      text,
  last_discount_percentage              numeric(6,2),
  last_gst_enabled                      boolean,
  last_gst_rate                         text,
  last_place_of_project                 text,
  last_project_type                     text,
  last_social_media_discount_enabled    boolean,
  last_social_media_discount_rate       numeric(6,2),
  last_warranty                         text,
  created_at                            timestamptz DEFAULT now(),
  updated_at                            timestamptz DEFAULT now()
);
CREATE TRIGGER trg_qprefs_updated BEFORE UPDATE ON quotation_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  INVOICES & PAYMENTS  (payments has NO owner column — owned via its invoice)
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  client_id        uuid REFERENCES clients(id) ON DELETE SET NULL,
  quotation_id     uuid REFERENCES quotations(id) ON DELETE SET NULL,
  invoice_number   text NOT NULL,
  client_name      text NOT NULL,
  project_name     text NOT NULL,
  invoice_date     date,
  due_date         date,
  status           text DEFAULT 'draft',
  total_amount     numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount      numeric(14,2) DEFAULT 0,
  remaining_amount numeric(14,2) DEFAULT 0,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount         numeric(14,2) NOT NULL,
  payment_method text,
  payment_date   date,
  notes          text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS payment_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  provider          text NOT NULL DEFAULT 'razorpay',
  event_type        text NOT NULL,
  provider_event_id text,
  amount            numeric(14,2),
  currency          text,
  status            text,
  raw_payload       jsonb,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user ON payment_logs(user_id);

-- =============================================================================
--  TEAM  (scoped by company_id = owner profile id; members have their own id;
--  attendance / assignments are owned via their team_member)
-- =============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id    uuid,                       -- the member's own Supabase auth id (nullable)
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  work_type  work_type NOT NULL DEFAULT 'other',
  status     team_member_status NOT NULL DEFAULT 'active',
  daily_rate numeric(14,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id);
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS team_member_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL,
  user_id           uuid,
  name              text NOT NULL,
  email             text NOT NULL,
  phone             text,
  work_type         text NOT NULL DEFAULT 'other',
  status            text NOT NULL DEFAULT 'pending',
  docs_request_note text,
  rejection_reason  text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tmr_company ON team_member_requests(company_id);
CREATE TRIGGER trg_tmr_updated BEFORE UPDATE ON team_member_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS team_project_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  quotation_id   uuid REFERENCES quotations(id) ON DELETE SET NULL,
  notes          text,
  assigned_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tpa_member ON team_project_assignments(team_member_id);

CREATE TABLE IF NOT EXISTS attendance (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id     uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  clock_in           timestamptz NOT NULL DEFAULT now(),
  clock_out          timestamptz,
  clock_in_location  jsonb,
  clock_out_location jsonb,
  notes              text,
  created_at         timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(team_member_id);

-- =============================================================================
--  TASKS  (scoped by company_id)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  assigned_to  uuid REFERENCES team_members(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'pending',
  priority     text DEFAULT 'medium',
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_company  ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  LIBRARY (templates, items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS terms_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL DEFAULT 'quotation',
  content       jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_code  text,
  is_default    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terms_user ON terms_templates(user_id);
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON terms_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS warranty_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  template_name text NOT NULL,
  content       text NOT NULL DEFAULT '',
  country_code  text,
  is_default    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warranty_user ON warranty_templates(user_id);
CREATE TRIGGER trg_warranty_updated BEFORE UPDATE ON warranty_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS bank_detail_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  template_name       text NOT NULL,
  account_holder_name text,
  account_number      text,
  bank_name           text,
  ifsc_code           text,
  upi_id              text,
  qr_code_url         text,
  country_code        text,
  is_default          boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_user ON bank_detail_templates(user_id);
CREATE TRIGGER trg_bank_updated BEFORE UPDATE ON bank_detail_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS payment_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  template_name text NOT NULL,
  stages        jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_code  text,
  is_default    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paytmpl_user ON payment_templates(user_id);
CREATE TRIGGER trg_paytmpl_updated BEFORE UPDATE ON payment_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS section_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  template_name text NOT NULL,
  category      text NOT NULL DEFAULT 'general',
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_code  text,
  is_default    boolean DEFAULT false,
  usage_count   integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sectmpl_user ON section_templates(user_id);
CREATE TRIGGER trg_sectmpl_updated BEFORE UPDATE ON section_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS quotation_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  template_name text NOT NULL,
  category      text NOT NULL DEFAULT 'general',
  description   text,
  sections      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default    boolean DEFAULT false,
  usage_count   integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quottmpl_user ON quotation_templates(user_id);
CREATE TRIGGER trg_quottmpl_updated BEFORE UPDATE ON quotation_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS item_usage_patterns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  product_name    text NOT NULL,
  product_details text,
  category        text,
  default_rate    numeric(14,2),
  preferred_rate  numeric(14,2),
  usage_count     integer DEFAULT 1,
  country_code    text,
  last_used_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iup_user ON item_usage_patterns(user_id);
CREATE TRIGGER trg_iup_updated BEFORE UPDATE ON item_usage_patterns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================================
--  GALLERY & SITE MEASUREMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  filename    text NOT NULL,
  image_url   text NOT NULL,
  title       text,
  description text,
  category    text,
  tags        text[],
  width       integer,
  height      integer,
  file_size   bigint,
  is_favorite boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_images(user_id);
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS site_measurement_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  client_name   text NOT NULL,
  site_location text,
  assigned_to   uuid REFERENCES team_members(id) ON DELETE SET NULL,
  quotation_id  uuid REFERENCES quotations(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'active',
  room_count    integer DEFAULT 0,
  photo_count   integer DEFAULT 0,
  total_area    numeric(14,2),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smp_user ON site_measurement_projects(user_id);
CREATE TRIGGER trg_smp_updated BEFORE UPDATE ON site_measurement_projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS site_measurement_rooms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES site_measurement_projects(id) ON DELETE CASCADE,
  room_name       text,
  room_type       text NOT NULL,
  width_ft        numeric(10,2) NOT NULL DEFAULT 0,
  length_ft       numeric(10,2) NOT NULL DEFAULT 0,
  height_ft       numeric(10,2),
  area_sqft       numeric(14,2),
  pricing_mode    text,
  quantity        numeric(12,2),
  rate_per_sqft   numeric(14,2),
  rate_per_unit   numeric(14,2),
  lump_sum_amount numeric(14,2),
  final_amount    numeric(14,2),
  notes           text,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smr_project ON site_measurement_rooms(project_id);
CREATE TRIGGER trg_smr_updated BEFORE UPDATE ON site_measurement_rooms
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS room_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES site_measurement_rooms(id) ON DELETE CASCADE,
  photo_url  text NOT NULL,
  caption    text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_photos_room ON room_photos(room_id);

-- =============================================================================
--  MISC
-- =============================================================================
CREATE TABLE IF NOT EXISTS feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  trigger_action text NOT NULL,
  rating         integer NOT NULL,
  feedback_type  text,
  message        text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);

CREATE TABLE IF NOT EXISTS subscription_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  event      text NOT NULL,
  actor      text,
  notes      text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subevents_user ON subscription_events(user_id);

CREATE TABLE IF NOT EXISTS user_activity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  activity_type text NOT NULL,
  activity_date date NOT NULL DEFAULT current_date,
  metadata      jsonb,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id, activity_date DESC);
