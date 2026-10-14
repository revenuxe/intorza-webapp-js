# Database and Cloudflare security review — 14 October 2026

## Assessment

Do not treat bot protection as the fix for the confirmed authorization issues. A human attacker, or a bot with a valid account, must still be denied access to other tenants and privileged subscription fields. The recommended architecture is the existing browser Supabase client with strict database/storage authorization, Supabase-enforced bot checks, hardened privileged functions, and Cloudflare protection on the application hostname.

This review used the connected Supabase CLI for policy/grant/function/storage metadata, deployed secret **names only**, deployed webhook source, and database network restrictions. Public Auth settings were read without retrieving users. Earlier synthetic transaction tests established tenant isolation and self-upgrade behavior. No customer records were read or changed, no forged payment event was submitted, and no persistent production settings were changed. Cloudflare account/zone settings, plan, CAPTCHA provider configuration, auth rate-limit configuration and redirect allowlist were not inspected; repository configuration is not evidence of their live dashboard state.

## Confirmed findings and exact locations

| Priority | Finding | Evidence | Required change |
| --- | --- | --- | --- |
| Immediate | Deployed webhook skips authentication | Deployed razorpay-webhook version 44 checks HMAC only if both secret and signature exist; secret-name inventory has no RAZORPAY_WEBHOOK_SECRET | Fail closed on absent secret/signature, validate raw-body HMAC before DB access; provision matching endpoint secret securely and deploy hardened source |
| Immediate | Profiles are readable across tenants and anonymously | Live public SELECT USING(true), table SELECT grants; HEAD and synthetic identity checks confirmed visibility | Apply reviewed private-profile/directory migration with coordinated frontend update |
| Immediate | A new user can make itself Pro | Rollback-only test updated synthetic own is_pro/pro_expiry and is_pro_user returned true | Deny browser writes/inserts to entitlement fields; retain trusted billing updates |
| High | Room object policies are bucket-wide | Private bucket has broad SELECT/INSERT/DELETE policies | Apply reviewed photo isolation migration and test owner/assigned-worker paths |
| High | Team auth creation lacks target tenant validation | Service-role linking in deployed-era source checks supplied company ID but not target member ownership; hardened local source exists | Deploy target ownership, identity, unlinked-state and entitlement checks; require a returned linked row |
| High | Payment verification and webhook lifecycle remain weak | Source trusts signed IDs without authoritative purchase ownership/amount reconciliation; nontransactional writes and entity-ID deduplication | Store server-owned purchases and apply one atomic, idempotent event transition using verified provider facts |
| High | Email signup is immediately usable | Public Auth settings: disable_signup=false, mailer_autoconfirm=true, email and Google enabled, anonymous sign-ins disabled | Require verified email for email/password signup, coordinate team join-request flow and transactional mail delivery |
| Medium | No bucket MIME or size limits | All three storage buckets report null allowed_mime_types/file_size_limit | Set bucket-level limits consistent with supported uploads; browser validation is insufficient |
| Medium | Database connections allowed from all networks | Applied allowlist includes 0.0.0.0/0 and ::/0 | Restrict Postgres/pooler to required operational networks after inventory; preserve CLI/backup/operator access |
| Hardening | Excess anonymous and authenticated grants | Private tables broadly grant anon CRUD; all 30 public tables grant TRUNCATE to anon/authenticated | Revoke unnecessary grants; keep explicit allowed public directory and response APIs; remove TRUNCATE/REFERENCES/TRIGGER from browser roles |
| Hardening | Public function surface is broad | Several role helpers and trigger functions grant anon EXECUTE | Review function-by-function; remove unnecessary execution, preserve authenticated RLS dependencies and required trusted calls |
| Design | Public response links mutate on page load | QuotationResponse calls respond_to_quotation directly on GET navigation; known document UUID authorizes action without expiry | Use separate random scoped expiring/revocable response tokens and explicit confirmation; prevent email-link scanners accepting/rejecting documents |

RLS is enabled on all 30 public tables. Earlier owner/other-user synthetic controls denied cross-tenant reads for clients, invoices, quotations, feedback, team_members and payments. This does not establish every write or relationship boundary. Broad grants alone do not demonstrate that RLS-filtered rows are exposed. TRUNCATE is not constrained by RLS, but the ordinary REST table API does not expose a TRUNCATE operation; this is excess privilege, not a demonstrated anonymous REST deletion exploit.

The user-facing payment functions rejected all 12 missing/invalid/public-key token tests with 401. That result excludes the webhook. Webhooks should authenticate Razorpay signatures rather than require an end-user login. The deployed webhook's conditional signature check is the immediate problem; configuring a secret alone would still leave missing-signature requests unchecked in that old source.

## Where to add bot protection

### 1. Cloudflare Turnstile enforced by Supabase Auth

Create a Managed Turnstile widget for the production application hostname. Use a separate development widget or documented test keys for local tests. Supply its public site key through a public frontend build variable, for example NEXT_PUBLIC_TURNSTILE_SITE_KEY. Store the private Turnstile secret in **Supabase Auth CAPTCHA settings**, not frontend code.

Integrate a widget and fresh captchaToken into email/password login, signup and password-recovery flows, including every company/team/admin entry point that uses those methods. Reset tokens after attempts, expiration and errors. Enable CAPTCHA enforcement in Supabase Auth only when the frontend integration is ready. Verify that a direct request to Supabase signup/login/recovery without a valid token is rejected, not merely that the widget appears. Review OAuth separately; a CAPTCHA on email/password methods does not prove equivalent enforcement on OAuth.

Relevant source locations: src/views/Auth.tsx, src/views/team/TeamSignup.tsx, src/views/team/TeamLogin.tsx and src/views/admin/AdminLogin.tsx. No captchaToken/Turnstile integration was found in the current source. The privileged provider's current CAPTCHA setting was not inspected.

Supabase supports Turnstile and CAPTCHA tokens in its Auth flow: [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha). Custom protected forms/endpoints must validate tokens server-side rather than trust a frontend success callback: [Cloudflare validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

### 2. Supabase Auth safeguards

Require email confirmation; configure production SMTP and exact redirect URLs; set and test Auth rate limits for signup, login, verification and recovery. Use the provider's actual supported controls and monitor legitimate traffic before aggressive tuning. Preserve account-enumeration-resistant messages.

Enabling email confirmation affects TeamSignup: it currently inserts a join request immediately after signUp. With no confirmed session, that insert can fail. Move request submission to a verified signed-in step or a properly authenticated server flow. Owners must approve membership; user-supplied metadata and email suffixes must not grant roles or organizational access. Constrain new join-request status to pending and make privileged transitions server/owner-controlled.

Require MFA for app administrators and sensitive actions, enforced in backend/RLS using verified assurance—not a frontend toggle. Also require MFA on the Supabase organization and Cloudflare operator accounts. Supabase app MFA enforcement differs from Supabase dashboard-account MFA: [App MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Platform MFA](https://supabase.com/docs/guides/platform/multi-factor-authentication).

### 3. Limit expensive operations at their actual endpoint

Order creation, auth-account creation, uploads, quotation-response operations and bulk exports need bounded requests and persistent rate controls. Payment functions are hosted on Supabase, so limits must apply there (for example, an atomic server-owned database counter keyed by authenticated user and operation). Cloudflare Worker rate limits apply only to calls actually routed through the Worker. Use account-level and IP-level controls where appropriate; shared-IP users must not all be locked out by an overaggressive rule.

Do not use Origin/Referer checks, CORS, obfuscated keys, or an in-memory counter as the authorization boundary. Durable quotas, body-size limits, validated input and provider ownership checks remain necessary after CAPTCHA succeeds.

## Cloudflare integrations for this app

| Integration | Location/configuration | Protection and limitation |
| --- | --- | --- |
| Turnstile | Cloudflare widget + frontend + Supabase Auth CAPTCHA secret | Highest-value signup bot control because Supabase validates the token at its own endpoint |
| WAF managed rules | Application domain's Cloudflare security rules | Enable the ruleset available on your plan; paid plans offer additional rulesets. Does not cover direct supabase.co traffic |
| Rate limiting rules | Actual application/API request paths on the proxied hostname | Tune against request traffic; limiting GET /auth alone does not limit direct Supabase password POSTs |
| Bot Fight Mode / Super Bot Fight Mode | Cloudflare bot controls, plan dependent | Supplemental scraping/automation mitigation; test real browsers, accessibility, monitoring and payment flows. Free Bot Fight Mode cannot be skipped with a WAF exception |
| Cloudflare Access | Prefer a dedicated admin hostname, or exact /admin paths including nested routes | Restrict staff entry with identity/MFA; retain application role checks and backend authorization because direct Supabase APIs remain reachable |
| TLS/security headers | Cloudflare HTTPS controls and Next/Worker response headers | HTTPS redirect; assess HSTS carefully; stage a CSP with Next, Turnstile, Razorpay, Supabase and PDF blob/worker needs before enforcement |
| Security events and alerts | Cloudflare events plus Supabase Auth/function/database logs | Alert on signup bursts, repeated authorization failures, webhook errors and unusual exports; redact tokens, keys and personal data |

Cloudflare plan availability must be checked before purchasing or configuring features. Current official guidance: [WAF setup](https://developers.cloudflare.com/waf/get-started/), [rate limiting availability](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Bot Fight Mode limitations](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/), [Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

The repository already disables workers.dev and preview URLs, which reduces alternate frontend entry points. Live WAF, bot controls, TLS configuration and Access policies were not verified. Do not blindly add browser challenges to machine-to-machine webhook routes: they cannot solve interactive challenges. Protect such endpoints with signatures, bounded processing and appropriate noninteractive abuse controls.

## Storage and data controls

Retain public access only for assets intentionally shareable. Company logos, signatures and bank QR images currently share a public bucket; consider moving signatures and other confidential assets to a separate private bucket with short-lived authorized URLs. Public galleries also need a deliberate privacy decision. Changing a bucket to private without updating PDF/image loading can break documents.

Set per-bucket size/type restrictions and server-side validation; the existing frontend cap is 15 MiB and supported image formats include uploads requiring compatibility review. Prefer rasterized accepted formats, disallow raw SVG/HTML/executables unless there is a justified sanitized pipeline, and verify content rather than trusting filename/MIME alone. For higher-risk user uploads, scan/quarantine before publication; an antivirus service is supplemental and does not repair tenant authorization.

Enforce cross-tenant foreign-key relationships, numeric constraints and authoritative financial totals. A client ID or team ID that exists is not necessarily owned by the caller. Add optimistic version checks for edits, immutable issued-document snapshots, and reliable payment reconciliation. Keep payment audit tables server-written and user-readable only as intended.

Restrict Postgres/pooler networks as an additional control. These restrictions **do not cover Auth, REST or Storage HTTPS APIs**, so they cannot fix the pentest's API exposure: [Supabase network restriction limitations](https://supabase.com/docs/guides/platform/network-restrictions).

## Release sequence

1. Coordinate deployment of the prepared private-profile/directory and room-photo migrations, frontend directory changes and team-function hardening. Confirm the key user flows and negative tenant checks after applying only reviewed additive migrations; old migration history is divergent.
2. Provision the matching Razorpay webhook secret securely, deploy the already fail-closed local webhook source, and verify valid/invalid/missing signatures in provider test mode. Treat missing-secret rejection as intentional containment, not successful payment processing. Complete atomic ownership/idempotency/retry handling before approving paid launch.
3. Integrate Turnstile and the verified-email join-request flow, then enable Supabase CAPTCHA/email enforcement. Check all login/signup/recovery entry points before rollout.
4. Configure Cloudflare WAF, tuned rate limits, admin Access and appropriate bot controls after checking the account's plan. Verify that alternate paths and direct APIs cannot bypass the real authorization checks.
5. Tighten table/function grants, upload limits, direct DB networks and MFA. Review backups/PITR and perform a restore drill before relying on recovery. Establish operational alerts and an incident owner.
6. Add release checks: environment validation, source/assets secret scan, unit/browser checks, tenant READ/WRITE denial tests, anonymous API checks, signature/ownership/payment replay checks and a repeat pentest. Keep production checks read-only or rollback-only with synthetic data.

No system is made completely safe by a bot product or a one-time scan. Release readiness means these controls are enforced at the real endpoints and the negative tests continue to pass. The immediate live authorization and webhook findings remain unresolved until their reviewed changes are deployed.
