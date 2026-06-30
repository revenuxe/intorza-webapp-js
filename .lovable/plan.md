## Goal

Supabase = **Auth only** (login, signup, session, JWT).
Everything else (quotations, invoices, payments, clients, teams, templates, gallery, files) goes through **AWS Amplify Functions → RDS PostgreSQL + S3**.

After this migration, the frontend has **zero `supabase.from(...)` and zero `supabase.storage` calls**. Only `supabase.auth.*` remains.

---

## Architecture (target)

```text
React (Amplify Hosting)
      │  Bearer <Supabase JWT>
      ▼
API Gateway → Amplify Function (Express on Lambda)
      │   verifies JWT via Supabase JWKS
      ├──► RDS PostgreSQL  (all tables)
      └──► S3              (logos, signatures, gallery, room photos, QR)
```

Supabase URL is used **only** by the browser's auth client and by the Lambda for JWT verification (public JWKS, no service key).

---

## Phase 1 — RDS foundation (done, verify)

1. Apply `backend/schema.sql` to RDS (1:1 mirror of 30 Supabase tables, enums, FKs, `updated_at` triggers).
2. `npm run db:test` from `backend/` confirms tables exist.
3. `npm run migrate:data` copies historical rows from Supabase to RDS (idempotent).

Deliverables already in repo: `backend/schema.sql`, `backend/scripts/{apply-schema.sh,migrate-data.js,test-connection.js}`.

---

## Phase 2 — Backend API (Amplify Function on Lambda)

Stand up the Express app in `backend/src/` behind API Gateway at `https://api.intorza.com`.

Middleware:
- `auth.js` — verifies `Authorization: Bearer <jwt>` against `SUPABASE_JWKS_URL`, attaches `req.user.id`.
- `db.js` — `pg.Pool` with SSL, parameterized queries only.
- `cors.js` — allow Amplify + custom domain origins.

Routes (one file per resource, all scoped by `req.user.id`):

| Route | Methods | Replaces |
|---|---|---|
| `/clients` | GET, POST, PATCH, DELETE | `supabase.from('clients')` |
| `/quotations` | GET, GET/:id (with sections+items+images), POST (txn), PATCH, DELETE (cascade) | `quotations`, `quotation_sections`, `quotation_items`, `quotation_item_images` |
| `/invoices` | GET, GET/:id (+payments), POST, PATCH, DELETE | `invoices` |
| `/payments` | POST, DELETE | `payments` |
| `/profiles/me` | GET, PATCH | `profiles` |
| `/preferences` | GET, PUT | `quotation_preferences` |
| `/templates/{quotation,section,terms,warranty,payment,bank}` | CRUD | matching `*_templates` |
| `/gallery` | GET, POST (after S3 upload), DELETE | `gallery_images` |
| `/teams/{members,requests,assignments,attendance,tasks}` | CRUD + actions | team tables |
| `/site-measurements/{projects,rooms,photos}` | CRUD | site_measurement_* |
| `/library/items` | GET, POST (learn) | `item_usage_patterns` |
| `/files/sign-upload` | POST → presigned S3 PUT URL | replaces `supabase.storage.upload` |
| `/files/sign-download` | POST → presigned S3 GET URL | replaces signed-url fetches |
| `/admin/*` | role-gated via `user_roles` | admin pages |

Deployment: package `backend/` as a single Lambda (already has `serverless-http`), wire to API Gateway HTTP API, env vars `DB_*` + `SUPABASE_JWKS_URL` + `AWS_BUCKET` + `AWS_REGION`. No code in Amplify Hosting build for backend; deploy via SAM/CDK or Amplify CLI Functions.

---

## Phase 3 — Frontend cutover

Create `src/lib/api.ts` (already exists — extend it) as the single fetch wrapper that:
- Reads JWT via `supabase.auth.getSession()`.
- Sends `Authorization: Bearer <jwt>` to `VITE_API_BASE_URL`.
- Throws typed errors.

Then replace usages **module by module** (one PR per module to keep diffs reviewable):

```text
order of cutover (low → high blast radius)
─────────────────────────────────────────
1. Library    : terms, warranty, payment, bank templates, gallery, items
2. Profile    : settings page, onboarding
3. Clients
4. Quotations : list, detail, create/edit, sections+items+images
5. Invoices   : list, detail, payments
6. Teams      : members, requests, attendance, tasks, assignments
7. Site Measurements
8. Admin
```

For each module:
- `rg "supabase.from\\('<table>'" src` → migrate every call to `api.<resource>.*`.
- Replace `supabase.storage.from(...).upload(...)` with: request presigned PUT from `/files/sign-upload`, PUT file directly to S3, store returned key/URL via the resource API.
- Update React Query keys to use API responses (shape stays identical; backend returns same JSON).

Done when:
```bash
rg -n "supabase\\.from\\(|supabase\\.storage\\." src
```
returns **only** `src/integrations/supabase/client.ts` and `src/lib/api.ts` (no business-logic hits).

---

## Phase 4 — File storage cutover (S3 only)

Folder layout in `S3_Bucket`:

```text
users/{user_id}/logo/...
users/{user_id}/signature/...
users/{user_id}/payment-qr/...
users/{user_id}/gallery/{uuid}.{ext}
users/{user_id}/rooms/{room_id}/{uuid}.{ext}
```

- Backend issues presigned URLs (SigV4) using `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` already in env.
- Extension whitelist: jpg, jpeg, png, webp, pdf. Max 10 MB.
- Prefix isolation enforced server-side (`users/{req.user.id}/...`) — client cannot specify another user's prefix.
- Delete the Supabase storage buckets (`company-logos`, `gallery-images`, `room-photos`) **only after** a verification script lists every row's URL and confirms it points to S3.

Existing `supabase/functions/s3-upload` edge function is removed after frontend stops calling it.

---

## Phase 5 — Decommission Supabase DB

1. Pause writes for 1 hour, run final `npm run migrate:data` (idempotent).
2. Row-count diff: `SELECT count(*)` per table on Supabase vs RDS, must match.
3. Flip `VITE_API_BASE_URL` in Amplify env to production API.
4. Mark Supabase DB **read-only** (revoke INSERT/UPDATE/DELETE from `anon` and `authenticated`) for 1 week as a safety net.
5. After 1 week clean, drop the public schema or downgrade Supabase project to Free (Auth-only stays free).

What stays on Supabase forever:
- `auth.users`, sessions, JWT signing keys, password reset, OAuth.
- Nothing in `public.*`.

---

## Security checklist

- JWT verified on every request (no Lambda route is anonymous except `/health`).
- All SQL parameterized (`$1, $2, ...`).
- `user_id` scoping enforced in the WHERE clause of every query — not just on insert.
- SSL required on RDS connection (`ssl: { rejectUnauthorized: false }` with CA pin in prod).
- S3 presigned URLs expire in 15 min, scoped to one object key.
- `service_role_key` removed from frontend; only Lambda holds AWS creds.
- CORS allowlist: Amplify domain + custom domain only.

---

## Verification gates (must pass before each phase ships)

| Gate | Command | Pass criteria |
|---|---|---|
| Schema parity | `npm run db:test` | All 30 tables present |
| Data parity | row-count diff script | Δ = 0 per table |
| No Supabase DB calls | `rg "supabase\\.from\\(" src` | 0 hits outside `api.ts` |
| No Supabase Storage | `rg "supabase\\.storage" src` | 0 hits outside `api.ts` |
| Auth still works | Playwright login + create quote | Quote lands in RDS, file in S3 |
| PDF parity | open 3 historical quotes + 3 invoices | identical render |

---

## Deliverables this migration produces

- `backend/src/routes/*.js` — full CRUD for every module above.
- `backend/src/middleware/{auth,cors,error}.js`.
- `backend/src/files/s3.js` — presigned URL issuer.
- `src/lib/api.ts` — typed client with all resource modules.
- `src/lib/s3Upload.ts` — refactored to call `/files/sign-upload`.
- `DEPLOYMENT.md` — Lambda + API Gateway + Amplify env wiring.
- Migration verification script: `backend/scripts/verify-parity.js`.

---

## Open question before I start building

You have **two options** for hosting the backend — both work, pick one:

**A) AWS Amplify Functions (Lambda)** — matches your stated architecture; one `amplify add function`, deploys with the frontend.
**B) Standalone Lambda + API Gateway via SAM/CDK** — fully decoupled, easier to scale independently, but a separate deploy pipeline.

Reply with **A** or **B** and I'll start Phase 2 (route implementation) and Phase 3 (frontend cutover, library module first).
