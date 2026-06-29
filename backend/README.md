# Intorza — AWS RDS Migration (Quick Start)

Supabase stays for **Auth only**. All application data lives in **AWS RDS PostgreSQL**.

## 1. Set credentials

`backend/.env` (copy from `.env.example`):

```bash
DB_HOST=intorza-prod.xxxx.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=intorza
DB_USER=intorza_app
DB_PASSWORD=********
DB_SSL=true

SUPABASE_URL=https://gclsgkhtwqurniitfeir.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # service-role, ONLY for one-off migration
```

> The same `DB_*` vars must be set in your AWS Amplify Function / Lambda env.

## 2. Apply schema to RDS

```bash
cd backend
npm install
DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" \
  npm run migrate:apply
npm run db:test
```

`db:test` confirms the connection and lists all `public.*` tables.

## 3. Copy data from Supabase → RDS

```bash
npm run migrate:data              # all tables
npm run migrate:data quotations   # single table
```

The script is idempotent (`ON CONFLICT (id) DO NOTHING`) — safe to re-run.

## What the schema mirrors

Exact 1:1 mirror of the Supabase `public` schema, including:

- **Core**: `profiles`, `clients`, `user_roles`
- **Quotations**: `quotations`, `quotation_sections`, `quotation_items`,
  `quotation_item_images`, `quotation_preferences`, `quotation_templates`,
  `section_templates`
- **Invoices & Payments**: `invoices`, `payments`, `payment_logs`,
  `payment_templates`, `bank_detail_templates`
- **Teams**: `team_members`, `team_member_requests`, `team_project_assignments`,
  `attendance`, `tasks`
- **Site measurement**: `site_measurement_projects`, `site_measurement_rooms`,
  `room_photos`
- **Library**: `gallery_images`, `item_usage_patterns`, `terms_templates`,
  `warranty_templates`
- **Meta**: `feedback`, `user_activity`, `subscription_events`

All foreign keys (e.g. `quotation_sections → quotations`,
`quotation_items → quotation_sections`, `payments → invoices`,
`invoices → quotations/clients`) and PostgreSQL enums (`app_role`,
`team_member_status`, `work_type`) are recreated. `user_id` columns reference
Supabase Auth and intentionally have no FK in RDS.

A generic `updated_at` trigger is auto-attached to every table that has the
column.
