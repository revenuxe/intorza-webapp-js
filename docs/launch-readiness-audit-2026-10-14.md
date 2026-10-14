# Launch readiness audit — 14 October 2026

## Verdict

Do not approve a public paid launch yet. The application has a working foundation, but live access policies and backend authorization expose material tenant and subscription risks. Passing builds and happy-path browser tests do not cover these boundaries.

This review inspected current working-tree source, migrations, existing documentation, live schema/policy/grant metadata, and local automated checks. No customer records were read or changed. No application fixes or deployments were performed. Local source findings do not prove that the same function revision is deployed.

## Architecture and table responsibilities

Next App Router supplies routes; src/views contains feature screens; browser requests use the shared Supabase client, sometimes through src/lib/api.ts and sometimes directly. Supabase Postgres/RLS is the primary authorization boundary. Edge Functions implement privileged payment and team-account operations. PDF creation runs in the browser with jsPDF; PDF.js renders the generated document. Cloudflare/OpenNext hosts the frontend; deploying it does not deploy Edge Functions or SQL.

The live database has 30 public tables, all with RLS enabled:

| Domain | Tables | Assessment |
| --- | --- | --- |
| Identity | profiles, user_roles | Profile business fields and privileged entitlement fields share one writable row: dangerous privilege boundary |
| Customers/documents | clients, quotations, quotation_sections, quotation_items, quotation_item_images, invoices, payments | Reasonable normalized quotation model; monetary validation and concurrency need strengthening |
| Library | quotation_templates, section_templates, terms_templates, payment_templates, bank_detail_templates, warranty_templates | Separate reusable resources are justified; old profile copies create competing sources |
| Measurements/media | site_measurement_projects, site_measurement_rooms, room_photos, gallery_images | Relational access checks do not compensate for broad storage-object policies |
| Team | team_members, team_member_requests, team_project_assignments, attendance, tasks | Legitimate separate responsibilities; service-role linking bypasses necessary tenant checks |
| Preferences/telemetry | quotation_preferences, item_usage_patterns, feedback, user_activity | Useful independent concerns; browser migration flags are not durable migration state |
| Billing audit | payment_logs, subscription_events | Useful separation, but processing lacks a single transactional event boundary |

No claim is made that every table is duplicate-free or that customer rows contain no duplicates: those require explicit aggregate checks and agreed business keys. Client-name snapshots on documents are useful historical denormalization, provided issuance freezes the rest of the document too.

## Launch blockers

### 1. Public profile disclosure — confirmed live metadata

The live policy `Anyone can view company names` applies to public, with SELECT USING (true). Both anon and authenticated have table-level SELECT privileges. This permits the profile row, not just company_name. Profiles include email, phone, address, bank-related fields and subscription information. A frontend select list does not restrict another caller's query.

Replace company discovery with an intentionally narrow directory RPC/view, update onboarding, then remove the broad policy. Test anonymous, owner, other tenant and admin reads explicitly.

### 2. Users can modify their own subscription fields — confirmed live authorization configuration

Authenticated has table-wide INSERT/UPDATE grants; the owner profile policies restrict row identity, not writable columns. The only live profiles trigger reported is handle_updated_at. The profile row includes is_pro/pro_expiry/payment_status; profileApi.update also accepts an arbitrary body. A caller can bypass the UI and attempt entitlement updates directly. The same issue must be addressed on INSERT, not only UPDATE.

Move entitlement state to a server-owned table or use explicit column grants and a narrow profile mutation API. Prove that owner requests cannot set privileged fields. Preserve legitimate billing updates through trusted server operations.

### 3. Room-photo storage crosses tenants — confirmed live metadata

The bucket is private, but public SELECT checks only bucket_id. Authenticated INSERT and DELETE also check only bucket_id. Multiple permissive policies overlap; adding a stricter policy alone will not remove broader access. Existing owner-named DELETE policy is also bucket-wide for authenticated users.

Replace every permissive broad policy with owner/project/team authorization. Account for old object paths. Verify one tenant cannot list, sign/read or delete another tenant's photos, while assigned workers retain intended access.

### 4. Team authentication linking lacks target ownership — confirmed source

supabase/functions/create-team-member-auth/index.ts verifies requestingUser.id equals supplied company_id, then uses service role to update team_members by team_member_id alone. It never verifies that the target member belongs to that company, is unlinked, or matches the submitted identity. A known foreign member ID could be relinked to a new attacker-controlled account. A zero-row update can also be reported as success.

Fetch and validate the target before creating auth; enforce company_id and unlinked state on the conditional update; require exactly one returned row. Handle concurrent requests and compensate failed auth creation/linking reliably.

### 5. Payment processing lacks durable, trustworthy reconciliation — confirmed source

razorpay-webhook ignores returned database errors for profile/log/event writes, so it can return processed:true after failed writes. Deduplication uses payment/subscription entity IDs rather than a distinct event receipt; different events can collide. Check-then-insert is not atomic. No-user events are acknowledged without processing, and refund handling depends on payment/subscription notes rather than durable refund-to-payment ownership.

razorpay-verify-payment validates a signature but does not fetch and validate payment amount/currency/capture status and ownership against a server-stored order/subscription. It hardcodes a 50-paise log amount and activates the currently authenticated user. Verification and webhook paths separately update the same entitlement and deduplication log, producing conflicting lifecycle behavior.

Use a server-owned purchase record and verified provider facts, one transactional billing transition, unique event receipts, explicit retryable failures, and reconciliation for missed/out-of-order events. Exercise replay, concurrent delivery, failed database writes, refund and cancellation flows. Existing docs report a missing webhook secret and an undeployed hardening change; secret/deployed-code status was not rechecked in this audit.

## Editor correctness and overlap

### Invoice preview is not an accurate document preview

InvoicePreviewEditor.tsx builds a sample document: today's invoice date, a due date 30 days ahead, a fabricated payment row and generic notes. `paidAmount || 50000` replaces a legitimate zero with 50000; equivalent fallbacks affect remaining and total amounts. InvoiceDetail supplies no real dates/payment history to the preview prop, while its download handler uses actual document data. A user can approve a preview that differs materially from the downloaded invoice.

Use one typed document-data builder for preview and export. Preserve zero with nullish defaults and pass real dates, notes and payments. Assert extracted PDF values for unpaid, fully paid and zero-value documents.

### Invoice generation can race

Invoice preview debounces generation but has no generation token or stale-result guard. An older slow render can replace a newer preview, or publish a URL after closing. Quotation preview already has a job-ID pipeline. Share that lifecycle or apply equivalent cancellation/version guards.

### PDF renderer resource and error handling

PDFCanvasPreview retains images for all visited pages although only nearby image elements mount; virtualization does not bound cached raster memory. Superseded PDF loads can return without destroying their newly created PDF.js document. Errors are logged without a clear retry/error state, and old images are deliberately retained while replacements load. Test fast edits, failures and repeated opens under throttling, and bound cache/document lifetimes.

### No-overlap certification remains open

Table-width fitting and focused PDF tests are positive. They do not establish that every theme/layout/font/field combination avoids clipping or overlap. Required visual matrix: all invoice layouts and representative quotation themes; long company/client/product text; multiline terms; many rows; maximum font/padding/line-height; images; all column toggles; page breaks; supported currencies; small mobile screens and zoom. Inspect both rendered pages and actual exported PDF. Existing browser coverage is Chromium and a basic mobile flow, not this matrix.

### Shared settings overlap

Both editors persist PDFEditorSettings using the same `pdfEditorSettings` localStorage key. The invoice “use quotation design” flag does not create independent storage when disabled: both updateSettings paths still write the same key. Changes can unexpectedly alter the other document editor. Keys are browser-global rather than user-scoped; switching accounts can inherit another account's visual settings. Some storage reads/writes are unguarded, so restricted/quota-exhausted storage can break editor operations.

### Historical PDFs are mutable

Library terms/profile branding/settings are resolved at generation time; issued documents lack a complete immutable issuance snapshot. Re-downloading after edits can change a previously shared document. Save a document revision with resolved terms, branding, data, settings and generator version, or retain the issued PDF artifact with controlled access.

## Database integrity and maintainability

- save_quotation is a useful authenticated transaction and preserves nested IDs. It trusts submitted numeric totals and item values rather than calculating authoritative totals; negative/inconsistent values and foreign client_id ownership need database-level validation. A foreign key proves existence, not tenant ownership.
- Header row locking serializes writes but provides no stale-version rejection. Two tabs can silently overwrite each other's full section list. Add expected revision/updated_at comparison and a conflict response.
- recalc_invoice_totals only recalculates COALESCE(NEW.invoice_id, OLD.invoice_id). Moving a payment leaves the old invoice stale. Changing invoice total does not trigger this payment trigger. Concurrent aggregate recalculation needs parent locking before reading totals; reproduce concurrency with two database sessions. Overdue status also does not advance merely because time passes.
- Existing migration history is documented as divergent from remote. Do not replay local history blindly. Reconcile definitions, constraints, policies, grants and functions into a tested baseline.
- select_terms_template serializes selections through its RPC, but direct owner writes to terms_templates remain possible. If one default per document type is a business invariant, enforce it with a partial unique constraint as well; audit duplicates before adding it.
- MyLibrary performs legacy profile-to-library imports in the browser using a localStorage flag and multiple writes. Partial failure, concurrent tabs or another device can duplicate/reimport data. Replace this with a transactional, idempotent operation and a database migration ledger.
- api.ts casts the typed client to any, weakening generated schema checking. Direct queries in views and library components distribute business rules across multiple entry points. Consolidate by feature after fixing authorization; client abstraction alone is not a security fix.
- Several list APIs select all rows with no pagination. Establish server pagination, bounded filters and query-plan evidence with representative volumes before claiming scalability.

## Verification performed

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Jest | 15 suites, 78 tests passed |
| Next production build | Passed; 26 static pages generated |
| Browser cases | All 8 cases reported passed, but runner did not exit during observation; interrupted after prolonged teardown |
| Supabase configuration | Browser/CLI project matched |
| Live schema inventory | 30 public tables with RLS; four required RPCs present |
| Live storage | Logos/gallery public, room photos private; unsafe room policies confirmed |
| ESLint | Failed: 675 errors, 68 warnings; includes generated .open-next files and source errors |
| Source-only lint | Failed: 271 errors, 31 warnings across src, Edge Functions and tests |

Browser tests intercept backend requests for important signed-in paths; they establish UI wiring, not real tenant isolation or provider payment correctness. Build checks validate Next output, not a fresh Cloudflare production deployment. No dependency vulnerability scan, recovery drill, load test, all-layout visual certification, real OAuth callback, real payment lifecycle, or full deployed Edge Function comparison was completed. These remain explicit verification gaps.

## Recommended release order

1. Close public profile exposure, entitlement writes, room-photo isolation and team-link authorization. Verify negative access cases against real RLS with synthetic tenants.
2. Unify payment processing and prove ownership, amount, idempotency, retry and refund behavior in provider test mode.
3. Make invoice preview/export identical; prevent stale render publication; isolate editor settings; add issuance snapshots and financial invariants.
4. Reconcile migrations and establish a meaningful lint/CI gate excluding generated artifacts. Complete the visual matrix and Cloudflare smoke test.
5. Verify backup/restore, monitoring, error reporting, webhook alerts, bounded queries and operational rollback. Then approve a controlled launch based on evidence.

The existing atomic quotation save, transactional terms selection, shared upload validation/cleanup, focused tests and offline-cache restraint are good foundations. They do not offset the confirmed authorization blockers.
