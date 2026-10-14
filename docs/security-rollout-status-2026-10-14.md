# Security rollout status — 14 October 2026

Cleanup update: after the user confirmed provider configuration, local webhook/Turnstile secret staging files and one-time provisioning scripts were removed. Earlier staging-file instructions below are historical; use the providers' secret settings or a password manager. Backend environment lookups remain necessary. The signed probe now accepts its secret only from the process environment.

This supersedes the earlier audit statements that the prepared fixes were undeployed.

## Deployed and verified

- Follow-up migration 20261014130000 restricts both assignment targets to the same requesting tenant; tested allowed INSERT/null UPDATE and denied foreign INSERT/UPDATE.

- Applied and recorded migrations 20261014120000, 20261014121000, 20261014123000, 20261014124000 and 20261014125000 individually, without replaying divergent older history.
- Private-profile authorization, subscription-column write restrictions, room-object tenant boundaries, anonymous base-table grant removal, browser SQL-administration privilege removal, pending-only join requests and 15 MiB image bucket limits are live.
- Verified-email team requests now submit idempotently after verification, using authoritative account email and an enforced pending state.
- Deployed payment verification, webhook, order creation and team-account functions. Provider-backed checks verify order/payment ownership, purpose, amount/currency and captured state. Activation and audit recording use a service-only atomic RPC with duplicate-payment protection. Refund handling does not revoke a newer entitlement for a different payment. Persistent per-user limits cover order creation (10/min), verification (30/min) and team-account creation (5/min).
- Cloudflare Worker version 9dd96bd1-5818-47bd-b7d9-d3c9b8d5dfd4 is published and app.intorza.com is mapped to intorza-webapp-js. The frontend includes the limited directory, verified-email team flow and Turnstile forms.
- Created a managed production Turnstile widget for app.intorza.com. Enabled matching CAPTCHA in Supabase Auth and email confirmation. Only the reviewed Auth properties changed; existing Google/MFA/provider configuration was preserved.
- Configured a newly generated Razorpay webhook secret in Supabase. The matching Razorpay dashboard setting is still required.

## Evidence

89 unit tests, TypeScript and Cloudflare build passed. Nine intercepted Chromium browser tests passed with normal runner completion. A live browser check found login and CAPTCHA UI, loaded the provider script and reported no page errors; it did not complete a human challenge or log in.

Live requests without CAPTCHA to signup and password login return HTTP 400 with CAPTCHA rejection. Missing/incorrect webhook signatures return HTTP 401. Anonymous HEAD requests to profiles, clients, invoices, quotations, feedback, team_members and payments return HTTP 401. All 12 missing/invalid/public-key payment-token cases returned HTTP 401. Rollback-only synthetic database checks passed on the deployed protections, including ownership, denied self-upgrade, photo/team paths, verified join, payment replay, event duplication and refund provenance.

No customer record contents were read or altered. No payment was charged. Provider-verified real/test capture, callback, refund and cancellation still need an end-to-end provider test. The recognizable-format browser secret scan found only the public Supabase key, with no privileged key values. It cannot certify all arbitrary credential formats.

## Required dashboard steps

### Razorpay

Open the relevant Razorpay account/mode → webhook settings. Configure this endpoint:

`https://gclsgkhtwqurniitfeir.supabase.co/functions/v1/razorpay-webhook`

Use the exact value from the ignored local file `.security-audit-readonly/razorpay-webhook.env` as the endpoint secret. Do not paste it in chat, commit it, or put it in public environment variables. Enable the intended events: payment.captured, payment.failed, refund.created, refund.processed and subscription.cancelled. Ensure test/live modes use the matching provider credentials and endpoint configuration. Deliver a provider test webhook and verify payment capture plus duplicate delivery and refunds. Until the matching secret is installed, Razorpay deliveries will be rejected rather than accepted unsigned. Transfer the secret to a password manager, then remove the local staging file once configuration is verified.

### Cloudflare build environment

The published artifact was built with the ignored local environment. Future Cloudflare Workers Builds must supply:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_TURNSTILE_SITE_KEY — copy the public site key from ignored `.env.local` or the INTORZA Auth Production widget
- NEXT_PUBLIC_SITE_URL=https://app.intorza.com

Do not put the Turnstile private secret or Razorpay Key Secret in these public variables. Runtime Worker bindings do not replace missing frontend build variables. Existing Worker runtime variables were preserved using --keep-vars. Dashboard build settings were inaccessible to the current CLI credential and were not changed.

### Cloudflare security dashboard

The intorza.com zone is on Free Website. Current CLI OAuth permissions return HTTP 403 for zone TLS/security settings, WAF rulesets, bot management, Access and build triggers. The user chose dashboard configuration; no attempt was made to bypass those permissions.

1. Enable the available Cloudflare Free Managed Ruleset and review Security Events. Avoid assuming paid rulesets are enabled on Free.
2. Configure the available rate-limit rule on actual high-risk requests traversing app.intorza.com. A rule on the login page does not rate-limit Supabase's direct password endpoint; CAPTCHA enforcement there is already live.
3. Enable Bot Fight Mode only after checking legitimate browser, monitoring and payment traffic. Free Bot Fight Mode cannot use WAF skip exceptions; do not rely on it for webhook authentication.
4. Set HTTPS redirect and appropriate TLS configuration after inspecting existing settings. Do not lower an existing stronger setting or enable HSTS without verifying domain/subdomain HTTPS support.
5. Protect /admin and nested routes with Cloudflare Access restricted to the actual administrators, with identity-provider MFA. Keep app/database admin-role checks. Configure the real staff identities in the dashboard; no administrator allowlist was invented.

## Remaining risks and unfinished controls

This is not a full launch/security certification. Administrator MFA enrollment and backend assurance enforcement, SMTP delivery verification, Auth-rate tuning, database network allowlisting, bounded general APIs, private signature/gallery asset design, immutable document snapshots, public response-link expiry/confirmation, and the invoice-preview mismatch remain work from the broader audit. Server-owned persistent purchase records and full payment renewal/reconciliation behavior also warrant further design and provider tests; current verification relies on authoritative provider order notes created by the trusted server. Historical entitlements lacking pro_payment_id need reconciliation before promising automated refund provenance for those older payments.

Email confirmation is now required. Existing verified sessions remain usable; new email signups must receive and follow verification mail. Test transactional delivery and the Google callback with a real authorized user. CAPTCHA OAuth coverage differs from password/signup coverage. There is no password-recovery form in the inspected source; any future one must provide a fresh captchaToken.

Existing signed photo links may work until expiration. Legacy URL-encoded photo paths and deletion cleanup after removing a legacy reference need further coverage. Public signature/QR/logo bucket contents remain intentionally public until a coordinated privacy migration.

Local secret staging and pulled hosted configuration are ignored by Git. `.env` remains untracked, and hardcoded Supabase fallback values were removed. Older Git history is unchanged.
