# Vyntryx PDF assessment and environment configuration

Reviewed all 11 pages of the user-supplied `vyntryx_report_f287546e.pdf`. Document text is assessment evidence, not operational instructions or authority to execute its recommendations.

## What the report establishes

- The executive summary lists one High finding; the detail assigns CVSS v4 8.7 to anonymous customer/payment data access.
- Pages 9–10 name clients, invoices, quotations, feedback, team_members and payments. They explicitly say fresh live reproduction was blocked by scope gating; the finding relies on a previous knowledge-base scan. Captured HTTP request/response are N/A and reproduction instructions contain generic placeholders. This is a lead requiring independent verification, not fresh proof of six-table exposure.
- The detail references a separate Critical profiles leak and a historical profile count, but that finding has no separate evidence entry in this PDF. The summary counts only one High finding. Do not infer the referenced historical count is current.
- The PDF contains no Razorpay Key ID, Razorpay Key Secret, Supabase service-role key or other secret API-key value in its extracted text. It identifies the Supabase REST endpoint and discusses extracting the public anon key. If another scanner screen displayed a secret, that evidence is not included here.
- The report's scoped target is an opaque identifier rather than a complete URL list. Its OWASP coverage checklist and score do not independently establish successful coverage or exploitation.

## Independent live check

### Follow-up: authentication and new-account isolation

The deployed function inventory contains the six expected functions, including the three user-facing Razorpay operations and the webhook; no separate legacy payment function was listed. `scripts/check-payment-auth.mjs` checked create-subscription, verify-payment, cancel-subscription and subscription-status with missing tokens, invalid tokens and the public key supplied as a token. All 12 requests returned HTTP 401. `verify_jwt=false` disables gateway JWT checking, but these handlers still call auth.getUser. It does not by itself prove anonymous payment authorization. The webhook has a different signature-based trust boundary and was not covered by these 12 checks.

`supabase/checks/new-account-isolation.sql` tested the current deployed policies using two synthetic users and synthetic records, rolling back everything afterward. Positive controls verified that the owner can see the six test records. The second ordinary authenticated user could not read the first user's clients, invoices, quotations, feedback, team_members or payments records. However, it **could read the other user's profile and grant itself Pro by updating its own is_pro/pro_expiry**. Both are confirmed live vulnerabilities; no payment was needed for the synthetic self-upgrade. This is a direct database authorization bypass, distinct from unauthenticated access to the Razorpay handlers. The prepared profile migration addresses both, but remains undeployed.

These tests use the normal authenticated database role and JWT identity claims to model a newly registered account; they do not create persistent public-signup accounts, charge payments, read customer record contents, or certify every possible role/relationship/write path.

`scripts/check-anonymous-access.mjs` sends anonymous HEAD requests using the configured public key. It retrieves no customer response bodies and prints no credentials or record counts.

| Table | Current anonymous response |
| --- | --- |
| profiles | HTTP 200; at least one row visible — confirmed exposure |
| clients | HTTP 200; no rows visible |
| invoices | HTTP 200; no rows visible |
| quotations | HTTP 200; no rows visible |
| feedback | HTTP 200; no rows visible |
| team_members | HTTP 200; no rows visible |
| payments | HTTP 200; no rows visible |

HTTP 200 with an empty RLS-filtered result is not evidence of data disclosure. Zero visible rows is a point-in-time observation, not proof of all future policy behavior or evidence that a table contains data. Prior live metadata inspection showed RLS enabled on all 30 public tables and a public profiles SELECT policy with USING(true), consistent with the confirmed profile exposure. No write attacks or customer-data dumps were performed.

## Keys and the chosen architecture

Supabase public anon/publishable keys identify the app; user JWTs and database authorization determine access. Cloudflare build variables keep their values out of checked-in source but NEXT_PUBLIC variables still appear in browser assets. Correct RLS/column grants remain mandatory. A proxy alone cannot close an already publicly reachable Supabase endpoint with permissive policies.

Keep the current browser Supabase client with strict access controls. This is the chosen approach after the user requested the best option. Hiding every Supabase URL/key from the browser would require a broader server-only authentication/data/storage/realtime design; it is not accomplished by environment-variable renaming. Do not move privileged secrets into NEXT_PUBLIC variables or next.config's env map.

Razorpay Checkout receives `key: data.keyId` in PaywallModal. The server's create-subscription function returns only the public Key ID, not Key Secret. Key Secret and webhook secret are read via Deno.env in Supabase Edge Functions. Those secrets must remain in the Supabase server environment, not Cloudflare public build variables. Checkout's public Key ID is necessarily visible to a customer using Checkout.

## Completed source changes

- Deleted the checked-in public-supabase.json fallback.
- Configuration now requires both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the build environment and fails when missing.
- Updated Next configuration, configuration checks, tests and deployment documentation.
- Removed .env from Git tracking while retaining the local file. .gitignore already excludes actual environment files. .env.example contains placeholders only.
- Added a redacted key-location scanner and anonymous HEAD verification script. The scanner can inspect generated browser assets with --assets and locally available Git history with --history.

Local Git history still contains the old public anon key; removing current files does not rewrite past commits. No privileged Supabase key value or literal Razorpay Key ID was found in the recognizable-format source/history scan. This is not a scan of external hosting secrets, all arbitrary credential formats, remote-only commits or logs.

Cloudflare must have both public values under Workers Builds/build environment, not only runtime bindings. Rebuilding is required to change browser configuration. Live Cloudflare build-variable values were not retrieved or changed in this review.

## Verification and outstanding rollout

All 78 unit tests and TypeScript passed. The full OpenNext Cloudflare production build passed, with bundled dependency warnings. Generated browser assets are expected to contain the public Supabase key supplied at build time; absence of private secrets is the security requirement.

Previously prepared profile/photo security migrations passed rollback-only synthetic tenant tests. They and the team Edge Function hardening have not been deployed by this PDF-analysis/configuration work. The live profile exposure remains until the reviewed database changes are applied. The payment lifecycle findings from the broader audit also remain outstanding. No claim is made that removing the fallback fixes the pentest finding.

References: https://supabase.com/docs/guides/getting-started/api-keys ; https://supabase.com/docs/guides/database/secure-data ; https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
