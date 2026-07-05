# Intorza — Supabase → AWS RDS migration runbook

This is the **production data migration**. The whole point is to move every
quotation, invoice, client, etc. into AWS RDS **without losing a single row**.
Read the whole document before running anything. Do the dry run first.

Architecture after migration:
- **Auth stays on Supabase** (sign in / sign up / sessions). Nothing changes there.
- **All data lives in AWS RDS PostgreSQL**, behind the Express backend in this
  folder (deployed as an Amplify Function / Lambda).
- The frontend calls the backend (`src/lib/api.ts`) with the Supabase JWT as a
  bearer token; the backend verifies it against Supabase JWKS.

---

## 0. Prerequisites (gather first — do NOT paste secrets into chat or commit them)

- [ ] **AWS RDS PostgreSQL** instance provisioned (Postgres 15+), reachable from
      your machine (temporarily allow your IP in the security group, or use a
      bastion) AND from the Lambda's VPC/subnets.
- [ ] **AWS Secrets Manager secret** holding the DB creds as JSON:
      ```json
      { "host": "xxx.rds.amazonaws.com", "port": 5432, "dbname": "intorza",
        "username": "intorza_app", "password": "••••••" }
      ```
      Note its name/ARN → this is `DB_SECRET_ID`.
- [ ] **Supabase service-role key** (Project → Settings → API → `service_role`).
      Needed only by the migration script; it bypasses RLS to read every row.
      NEVER ship it to the frontend or commit it.
- [ ] **Supabase direct DB connection string** (Project → Settings → Database →
      Connection string → URI) for the backup + optional schema diff.
- [ ] `psql` and `pg_dump` v15+ installed locally.

> Reminder: rotate the AWS console password that was shared earlier and enable MFA.

---

## 1. BACK UP SUPABASE FIRST (non-negotiable)

Take a full logical backup of the live Supabase database before touching anything.
Keep it somewhere safe; this is your rollback.

```bash
# Full backup (schema + data) of the public schema
pg_dump --no-owner --no-acl --schema=public \
  "$SUPABASE_DB_URL" > supabase-backup-$(date +%Y%m%d-%H%M%S).sql

# Sanity check it's non-empty and contains your tables
grep -c "COPY public.quotations" supabase-backup-*.sql
```

Do not proceed until you have a verified backup file.

---

## 2. Capture source row counts (your verification baseline)

Record the row count of every table on Supabase **now**, so you can prove the
migration was complete afterwards.

```bash
psql "$SUPABASE_DB_URL" -At -F',' -c "
  SELECT relname, n_live_tup
    FROM pg_stat_user_tables
   WHERE schemaname='public'
   ORDER BY relname;" > counts-supabase.csv
cat counts-supabase.csv
```

(`n_live_tup` is approximate; for exact counts on the critical tables run
`SELECT count(*) FROM quotations;` etc.)

---

## 3. Create the RDS schema

`schema.sql` in this folder is the **source of truth** for the RDS schema (it is
the Supabase schema minus `auth.*`, minus RLS — security is enforced in the API).

```bash
cd backend
DATABASE_URL='postgres://intorza_app:PASS@xxx.rds.amazonaws.com:5432/intorza?sslmode=require' \
  bash scripts/apply-schema.sh
```

Optional — diff against the real Supabase schema to confirm nothing was missed:

```bash
SUPABASE_DB_URL='...' bash scripts/migrate-schema.sh ./supabase-schema-snapshot.sql
# then eyeball / diff supabase-schema-snapshot.sql against schema.sql
```

If the diff shows columns/tables in Supabase that schema.sql lacks, STOP and add
them to schema.sql (and the matching route) before migrating.

---

## 4. Dry run the data copy (read-only against Supabase)

The migration script (`scripts/migrate-data.js`) is **idempotent**: it inserts
with `ON CONFLICT (id) DO NOTHING`, so re-running never duplicates rows. Test one
small table first.

```bash
cd backend
cp .env.example .env   # fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
                       #          and DB_* (or DB_SECRET_ID + AWS creds), DB_SSL=true
npm install

node scripts/migrate-data.js clients   # one table
psql "$RDS_URL" -c "SELECT count(*) FROM clients;"   # compare to Supabase
```

---

## 5. Full data migration

> Tables are copied in FK-safe order (parents before children) — see the TABLES
> array in `scripts/migrate-data.js`. Do not reorder it.

For the cleanest cutover, do this during a short maintenance window so no new
writes land in Supabase mid-copy:

1. Put the app in maintenance mode (or just accept a short read-only window).
2. Run the full copy:
   ```bash
   node scripts/migrate-data.js          # all tables
   ```
3. Because it's idempotent, you can run it again right before cutover to pick up
   any last-minute rows.

---

## 6. Verify (the most important step)

Compare counts table-by-table. They must match (or RDS ≥ Supabase only by rows
you knowingly added).

```bash
for t in profiles user_roles clients quotations quotation_sections \
  quotation_items quotation_item_images quotation_preferences invoices payments \
  payment_logs team_members team_member_requests tasks team_project_assignments \
  attendance terms_templates warranty_templates bank_detail_templates \
  payment_templates section_templates quotation_templates item_usage_patterns \
  gallery_images site_measurement_projects site_measurement_rooms room_photos \
  feedback subscription_events user_activity; do
    s=$(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM $t;")
    r=$(psql "$RDS_URL"        -At -c "SELECT count(*) FROM $t;")
    printf '%-28s supabase=%-8s rds=%-8s %s\n' "$t" "$s" "$r" \
      "$([ "$s" = "$r" ] && echo OK || echo '*** MISMATCH ***')"
done
```

Also spot-check a few real quotations/invoices by id and confirm totals + line
items match.

---

## 7. Storage / files (do NOT forget)

Rows reference object keys: `quotation_item_images.s3_key`, `gallery_images.s3_key`,
`room_photos.s3_key`, `bank_detail_templates.qr_s3_key`, plus `logo_url` /
`signature_url` on profiles.

- If those objects currently live in **Supabase Storage**, the binary files must
  be copied to the **S3 bucket** the `s3-upload` function uses, preserving keys,
  or the URLs rewritten. DB rows alone are not enough.
- Decide and execute this **before** cutover, or images will 404 for users.

---

## 8. Deploy the backend + point the frontend at it

1. Deploy `backend/` as an Amplify Function / Lambda (Function URL or API Gateway).
   Set env in the Amplify console:
   - `DB_SECRET_ID` (+ `AWS_REGION`), `DB_SSL=true`
   - `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_AUDIENCE=authenticated`
   - `CORS_ORIGIN=https://app.intorza.com` (your real frontend origin)
   - Give the Lambda execution role `secretsmanager:GetSecretValue` on the secret,
     and put it in the RDS's VPC/subnets + security group.
2. Smoke test: `GET https://<backend>/health` → `{ ok: true }`, then an
   authenticated `GET /api/quotations` with a real user token.
3. Set the frontend env var **`VITE_API_BASE_URL`** to the backend URL and
   redeploy the Amplify frontend. This is the actual cutover switch.

---

## 9. Edge functions that still write to the DB (decision required)

These Supabase edge functions currently write to the Supabase DB and must be
repointed at RDS (or moved into this backend) or `profiles`/payment state will
drift after cutover:

- `razorpay-webhook`, `razorpay-verify-payment`, `razorpay-create/cancel-subscription`,
  `subscription-status` → update `profiles.is_pro / pro_expiry / payment_status`
  and `payment_logs` / `subscription_events`.
- `create-team-member-auth` → writes `team_members`.
- `s3-upload` → stays (it talks to S3, not the DB) but confirm bucket.

Recommended: move payment/subscription DB writes into the backend (it already has
RDS access), keeping Razorpay signature verification logic intact.

---

## 10. Rollback

If anything looks wrong after cutover: unset/revert `VITE_API_BASE_URL` and
redeploy the frontend → it talks to the original path again. Supabase data is
untouched by the migration (we only read from it), and you have the §1 backup.
Investigate, fix, re-run the idempotent copy, retry.
