# Admin dashboard launch audit — October 18, 2026

**Verdict: not ready for unconditional production sign-off.** The tested authorization boundaries work, and the current UI is substantially clearer, but dependency, authentication and reporting issues remain. A successful build and attractive layout do not resolve these findings.

Scope: `AdminDashboard`, login, `AdminGuard`, user/Pro directory, coin wallets, payment history, AI training, price catalogue and the training API. Reviewed source based on commit `222cce9`, inspected production database policies/functions and aggregate MFA coverage, ran synthetic rollback-only database tests, and checked live response headers. Local fixes below are not deployed by this audit. No customer records or production configuration were changed.

## Findings to address before sign-off

| Priority | Finding | Evidence and impact | Required work |
| --- | --- | --- | --- |
| High | Dependency audit is not clean | `npm audit --omit=dev --json` reports 15 affected package entries: 2 critical, 9 high, 4 moderate. Critical entries include `jspdf` and its effect on `jspdf-autotable`. These are advisory ratings, not demonstrated exploits against this application. | Triage reachable features, update compatible versions, and test PDF generation and preview. Some proposed fixes are major upgrades; do not apply force-upgrades blindly. |
| High | Local dependencies differ from the lockfile | Locked/installed versions differ for `jspdf-autotable` (5.0.2/5.0.8), `dompurify` (3.3.0/3.4.17), and Supabase JS (2.86.0/2.117.3). jsPDF is 3.0.4 in both. | Reconcile the intended lockfile and repeat validation in a fresh `npm ci` environment. Current local tests do not establish CI reproducibility. |
| High | Admin MFA is not established or enforced in the reviewed application paths | Production has one admin account and zero admins with a verified Supabase Auth MFA factor. The role guard, admin API and reviewed admin RPCs check role, not AAL2. This does not assess external identity-provider or Supabase platform-account MFA. | Add enrollment/challenge/recovery UX, enroll the operator, then enforce verified MFA at the API and database boundary. Stage this to avoid locking out the current operator. |
| High for reporting | Overview totals can be incomplete | `loadStats` downloads rows then uses `.length`, `.filter` and `.reduce`. Queries are unpaginated and therefore subject to the Data API row cap; its exact configured value was not measured. Invoice amounts are combined and displayed as INR without selecting/grouping currency. | Use admin-only database aggregates with exact counts and currency-specific totals; define a consistent reporting timezone. |
| Medium | Older tabs are not complete record browsers | Quotes, Invoices and Sites explicitly load only 100 rows. Companies, Feedback and Teams are unpaginated and subject to the Data API row cap. | Add server pagination, search, deterministic ordering and counts to these tabs. Local copy now discloses the three 100-record limits. |
| Medium | Expensive request fan-out | `loadUsers` makes three extra requests per profile; quote/invoice/site/team/feedback lists make another profile query per row. Every legacy list loads at startup, with reloads from realtime events. | Aggregate/join on the server and load the selected tab on demand. Debounce event bursts and cancel obsolete requests. No representative-volume load test was performed. |
| Medium | Null Pro duration grants access without an expiry | A rollback-only live test of `admin_set_pro_access(..., NULL)` produced `is_pro=true` and `pro_expiry=NULL`. The browser rejects this value, but the RPC does not. Only an already-authorized admin can reach this action in the tested configuration. | Reject null duration in SQL; verify the target exists in both grant/revoke branches; add input-boundary regression checks. This remains unfixed in production. |
| Medium | CSP and HSTS are absent on sampled live responses | Neither header was present on `/admin/dashboard` or `/api/admin/ai/training` in this audit. `nosniff`, `SAMEORIGIN` and private/no-store were present. | Introduce a tested CSP, initially in report-only mode, accounting for Next.js, Turnstile, Razorpay and Supabase. Configure HSTS after confirming HTTPS coverage. This is hardening, not evidence of an existing XSS exploit. |
| Medium | Legacy ownership labels still use editable profile email | Several overview tabs resolve their “User” email through `profiles.email`, whereas Users/Billing correctly use Auth login identity. | Use a shared admin identity lookup or clearly label those fields as company contact email. |
| Low | Anonymous execute grants on older privileged functions | Live `admin_set_pro_access` and `admin_adjust_coins` retain anonymous execute permission, although their internal role checks rejected unauthorized callers in the tested paths. | Revoke unnecessary public/anon execute grants. Preserve role and actor checks for authenticated callers. |
| Low | Lifecycle and resilience work remains | Two dashboard hook dependency warnings remain. The guard checks role when identity/loading changes, not periodically while an idle admin screen is open. New RPC components have error states but no explicit request deadline. | Refactor stable callbacks, revalidate on focus/role loss and add timeout/cancellation UX. Backend role revocation already rejected subsequent privileged reads in the live test. |

The raw dependency scan is saved locally in the ignored `.security-audit-readonly/admin-npm-audit-2026-10-18.json`. The production dependency selection includes shared/transitive tooling; 15 entries must not be interpreted as 15 independently exploitable browser bugs. The lockfile and installed dependency discrepancy is material to any upgrade decision.

## Confirmed protections

- All ten inspected tables have RLS enabled: profiles, quotations, invoices, feedback, site measurements, team members, user activity, payment logs, subscription events and user roles. Policies provide administrator read access and owner boundaries; enabling RLS alone would not establish these boundaries.
- Synthetic customer attempts to self-insert an admin role, directly grant themselves Pro, spoof an administrator for Pro/coin changes, access the admin directories or read another private profile were denied.
- Positive controls confirmed that a real synthetic admin can grant Pro and coins; subscription events record the actor and coin credit creates a ledger entry. Removing that role made subsequent directory access fail.
- Training API verifies the bearer token with Supabase Auth and checks the administrator role server-side. POST requires a production rate-limit binding, bounds request size, validates PDF content and review schema, stores source documents privately, and requires reviewed/anonymized approval before publication.
- Live anonymous GET to `/api/admin/ai/training` returned 401 with private/no-store caching. `/admin/dashboard` returned a 200 client shell with private/no-store; that status is not itself a data leak. Browser tests verified redirect/denial before admin controls render.
- Current payment-history and wallet RPCs enforce administrator access and paginate. Previously deployed billing checks cover newest Pro-purchase sorting and history beyond the first 20 records.
- The source credential scanner reported zero recognized privileged key occurrences. This is not a complete secret scan of infrastructure, historical deployments or all arbitrary key formats.
- React renders the reviewed record values as text; the reviewed admin components do not inject user data via `dangerouslySetInnerHTML`. The root application's static recovery script is a separate, reviewed source string.
- Service worker code caches the public offline screen, not authenticated account/API responses.

## Local fixes made during this audit

- Added visible failed-section warnings instead of leaving empty results or zeros indistinguishable from successful loads.
- Overview now rejects query errors before calculating totals; company/detail lookup errors are also surfaced.
- Global Refresh now reloads the active Users/Billing/Coin directory as well as legacy lists, and no longer always announces success after failed requests.
- Removed the email-domain block that contradicted the `admin@intorza.com` login placeholder. Access still depends on the actual backend admin role. Login trims email and sets password-manager autocomplete attributes.
- Removed explicit `any` lint errors in the audited dashboard/login paths and corrected effect dependencies/cleanup in the guard and payment/directory components. Two legacy dashboard hook warnings remain.
- Labelled the 100-row quote/invoice/site previews accurately.

These fixes are local source changes. No commit, push, frontend deployment, dependency upgrade, production authorization change or MFA enforcement was performed as part of this audit.

## Validation and its limits

- `npm run build:next`: successful production Next.js build and TypeScript validation.
- Targeted admin/API component tests: 20 passing across 5 suites.
- Browser tests: 5 passed (26.4 seconds) against the production Next.js build. Scenarios exercised: anonymous dashboard redirect; ordinary-user admin-login denial; administrator login with the formerly blocked company domain; failed-query warning; global refresh and recovery; mobile billing/history/wallet behaviour; AI PDF review workflow. These use mocked provider/API data and do not establish production credentials or infrastructure behaviour.
- `supabase/checks/admin-dashboard-security.sql`: passed against production in a rollback-only transaction using synthetic accounts. No synthetic records persisted.
- Null-duration behaviour reproduced independently in a rollback-only transaction; issue remains open.
- Targeted ESLint: zero errors, two legacy dashboard effect-dependency warnings.
- `git diff --check`: clean.

Not performed: an independent penetration test, a clean dependency installation, exhaustive accessibility audit, large-account load test, authenticated production UI walkthrough, new OpenAI inference, a real payment/refund, or a new Cloudflare Worker build/deployment. Browser assertions and static review cannot establish absolute security or operational reliability.

## Suggested release order

1. Reconcile dependencies, resolve/triage critical advisories, then run clean-install PDF and admin regressions.
2. Add the null-duration SQL guard and least-privilege grants with database regression checks.
3. Introduce and enroll admin MFA before enforcing AAL2 at every privileged boundary.
4. Replace Overview calculations with complete database aggregates and add pagination to the remaining record tabs.
5. Finish request lifecycle improvements and stage CSP/HSTS with provider compatibility tests.
6. Validate the Cloudflare build and complete a signed-in production smoke test before declaring the dashboard ready.

Authorization guidance used: [Supabase database functions](https://supabase.com/docs/guides/database/functions) explains privileged function execution and permission controls; [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) describes enrollment, challenge and authorization enforcement. Findings above are based on this repository and the observed live configuration, rather than inferred solely from documentation.
