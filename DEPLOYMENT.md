# Intorza — Supabase DB → AWS RDS Migration Guide

> Supabase is now **auth only**. All application data lives in AWS RDS
> PostgreSQL, accessed via Amplify Functions (Lambda) at
> `https://api.intorza.com`.

---

## Architecture

```
┌────────────────────┐    JWT     ┌──────────────────────┐    pg     ┌──────────────┐
│  React (Amplify)   │──────────▶ │ Amplify Functions    │ ────────▶ │  RDS Postgres │
│  src/lib/api.ts    │            │ backend/src/server.js│           │              │
└─────────┬──────────┘            └──────────┬───────────┘           └──────────────┘
          │                                  │ verifies JWT via JWKS
          │ Supabase Auth (signIn/signUp)    ▼
          └─────────────────────────────▶ Supabase Auth only
```

Frontend never touches RDS. Backend never trusts the client — it verifies the
Supabase JWT on every `/api/*` request.

---

## 1. Provision RDS

Already done per your confirmation. Verify:

```bash
psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER \
      password=$DB_PASSWORD sslmode=require" -c 'select version();'
```

Make sure the Amplify Function's VPC / security group can reach the RDS
subnet on 5432. If the Function is *not* in a VPC, allow your Lambda's egress
IP range in the RDS security group, or put both in the same VPC (preferred).

## 2. Apply the schema

```bash
cd backend
export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"
npm install
npm run migrate:apply        # runs backend/scripts/apply-schema.sh → schema.sql
```

## 3. Copy data from Supabase

```bash
# In backend/.env (LOCAL ONLY — never commit)
SUPABASE_URL=https://gclsgkhtwqurniitfeir.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase dashboard>
DB_HOST=...
DB_PORT=5432
DB_NAME=intorza
DB_USER=...
DB_PASSWORD=...
DB_SSL=true

npm run migrate:data         # idempotent; safe to re-run
```

Run with a single table name to retry one: `node scripts/migrate-data.js quotations`.

## 4. Move files out of Supabase Storage into S3

Buckets to drain: `company-logos`, `room-photos`, `gallery-images`.

```bash
# Quick approach with rclone (recommended):
rclone copy supabase:company-logos s3:intorza-prod/profile/logos/   --progress
rclone copy supabase:room-photos    s3:intorza-prod/site-measurement/rooms/ --progress
rclone copy supabase:gallery-images s3:intorza-prod/gallery/        --progress
```

After copying, run a one-off SQL to rewrite stored URLs from
`https://*.supabase.co/storage/v1/object/public/...` → the new S3 keys. The
schema already stores `s3_key` columns for new tables; legacy URL columns in
`profiles` should be set with an `UPDATE` driven by your S3 key naming.

Then delete the Supabase buckets in the dashboard — they should be empty.

## 5. Deploy the backend Lambda

You have two equivalent options on AWS:

### Option A — Lambda Function URL (simplest)

1. AWS Console → Lambda → Create function → Node.js 20.x → name `intorza-api`.
2. Upload `backend/` as a zip (or use Amplify CI per `amplify.yml`).
3. Handler: `src/index.handler`.
4. Configuration → Function URL → enable → Auth type `NONE` (we auth in code).
5. Configuration → Environment variables: copy the entries from
   `backend/.env.example` (excluding `SUPABASE_SERVICE_ROLE_KEY`).
6. Configuration → VPC: attach to the same VPC/subnets/SG as RDS.
7. Note the Function URL → wire it to `api.intorza.com` via CloudFront +
   Route 53, or use API Gateway in front.

### Option B — API Gateway HTTP API

1. Create HTTP API → integration: Lambda `intorza-api` → ANY `/{proxy+}`.
2. Custom domain `api.intorza.com` → ACM cert → base path mapping to stage.

Either way, frontend just calls `https://api.intorza.com`.

## 6. Frontend env

Add to Amplify Console → Frontend → Environment variables:

```
VITE_API_BASE_URL=https://api.intorza.com
VITE_SUPABASE_URL=https://gclsgkhtwqurniitfeir.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

`src/lib/api.ts` reads `VITE_API_BASE_URL`.

## 7. Port frontend modules off Supabase DB

This is the long tail of work. For each page that currently calls
`supabase.from(...)`, swap to `api` / a typed helper from `src/lib/api.ts`.

**Reference port (already wired):**

```ts
// BEFORE
const { data, error } = await supabase
  .from('quotations')
  .select('*')
  .eq('user_id', user.id);

// AFTER
import { quotationsApi } from '@/lib/api';
const { data } = await quotationsApi.list();
```

Order suggested (smallest blast radius first):

1. Quotations  ← reference impl ready in `backend/src/routes/quotations.js`
2. Clients
3. Invoices + Payments
4. Library (terms / payment / section templates)
5. Tasks + Team
6. Gallery
7. Site Measurement
8. Profile + Preferences
9. Razorpay (port the three edge functions to backend routes under `/api/payments/*`)

For each new resource: copy `backend/src/routes/quotations.js`, adjust
fields/validation, and add a typed helper to `src/lib/api.ts`.

## 8. Security checklist

- [x] RDS reachable **only** from the Lambda SG (no `0.0.0.0/0`).
- [x] All queries use `$1, $2` placeholders (no string concat).
- [x] Every query scopes by `WHERE user_id = $current_user` (RLS replacement).
- [x] JWT verified against Supabase JWKS on every `/api/*` request.
- [x] `SUPABASE_SERVICE_ROLE_KEY` is only used by `scripts/migrate-data.js`
      and is NEVER set in the Lambda environment.
- [x] CORS locked to `app.intorza.com` (set `CORS_ORIGIN`).
- [x] SSL enforced (`DB_SSL=true`).

## 9. Cutover plan

1. Migrate schema + data into RDS (steps 2–3).
2. Deploy backend (step 5) and verify `/health` returns 200.
3. Add `VITE_API_BASE_URL` and redeploy frontend.
4. Port modules one screen at a time. Each PR removes a `supabase.from(...)`
   call and adds an `api.*` call. Verify the screen end-to-end before moving on.
5. Once all screens are ported, run one final delta migration
   (`npm run migrate:data`) to catch rows written to Supabase during cutover.
6. Revoke the Supabase service role key. Disable the Supabase Database REST
   API in dashboard (Project Settings → API → disable Data API), keeping Auth on.
7. Empty Supabase Storage buckets (already drained in step 4).

---

## Local backend development

```bash
cd backend
cp .env.example .env  # fill in
npm install
npm run dev           # http://localhost:4000
curl http://localhost:4000/health
```

To hit the local backend from the Vite dev server, set in the project root
`.env.local`:

```
VITE_API_BASE_URL=http://localhost:4000
```
