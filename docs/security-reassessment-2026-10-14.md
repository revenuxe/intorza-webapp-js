# Post-dashboard security reassessment

Secret cleanup update: exact comparisons found zero staged webhook/Turnstile secret matches in tracked files, local Git history or browser assets. Local staging copies and one-time provisioning scripts were removed; deployed provider secrets were not changed. The previously conversation-disclosed webhook value still requires coordinated provider rotation; deleting a file does not rotate it.

## Verified current state

The Cloudflare build, TypeScript and 89 unit tests pass. OpenNext reports native Windows and bundled dependency warnings; those are not evidence of an authorization bypass. This check rebuilt locally, without republishing the unchanged app.

All 31 public base tables have RLS enabled. No literal USING(true)/WITH CHECK(true) policy was found in public/storage. Anonymous HEAD requests to the seven previously reported private tables return 401. Direct signup/password login without CAPTCHA return 400 with CAPTCHA rejection. Incorrect/absent webhook signatures return 401. A correctly signed unknown event returns 200/processed:false before DB/provider processing, establishing that the local secret matches the deployed handler. This does not verify what Razorpay's dashboard stored or a real provider delivery.

The deployed synthetic rollback suite passed owner/team/photo boundaries, self-upgrade denial, verified team joining, persistent API limits, service-only atomic payment activation, cross-account payment replay denial and refund provenance. Tests do not substitute for provider-mode capture/refund/callback checks or every possible relational write.

Auth configuration matches the intended CAPTCHA, email-confirmation and redirect settings. Thirteen undeclared hosted settings in the CLI diff are preserved remote configuration, not thirteen faults. The secret is masked and cannot be compared through that diff.

Cloudflare WAF, bot, Access, TLS and build configuration continue to return 403 to current credentials. User-reported dashboard setup is recorded, but these settings have not been independently inspected. app.intorza.com maps to the expected production Worker.

## New confirmed relationship flaw

Update: migration 20261014130000 has now been applied and recorded. Restrictive INSERT/UPDATE policies require both member and quotation ownership. The updated synthetic check verifies valid own assignments, rejected foreign INSERT/UPDATE and preserved null quotation references. Broader relationship checks below remain outstanding.

`supabase/checks/relationship-isolation-review.sql` creates two synthetic users and an owner-owned team member plus another tenant's quotation. Under the first user's ordinary authenticated Pro session, inserting a team_project_assignments row joining its member to the foreign quotation succeeds. All changes roll back. This confirms the policy checks member ownership but fails to check quotation ownership.

This permits a cross-tenant association when an attacker knows a foreign quotation UUID. It does not establish that the quotation can be read through this association; earlier direct quotation reads remain denied. Remedy: enforce both sides on INSERT and UPDATE, disallow invalid ownership changes to the linked records, and cover dependent DELETE/cascade behavior. Review tasks.assigned_to/quotation_id, measurement assigned_to/quotation_id, quotations.client_id and invoices.client_id/quotation_id similarly; their foreign keys alone establish existence, not tenant consistency. No production relationship fix was applied in this analysis turn.

## RLS warnings to interpret correctly

- api_rate_limits has RLS enabled with zero policies intentionally: anon/authenticated have no table grants and only service_role operates through a privileged function. Do not add a permissive browser policy to clear a no-policy warning.
- companies_public uses owner-rights to expose a limited public directory by design. A security-definer-view warning needs review of columns/grants and base-table privacy; blindly switching to invoker may break anonymous discovery.
- Several public trigger/helper functions still grant anon EXECUTE. has_role(uuid,role) and is_pro_user(uuid) run with definer rights and can disclose role/entitlement booleans for a supplied identity. Reduce anonymous execution and scope helper identity lookup, preserving RLS dependencies. Trigger functions are not normal callable data endpoints, but redundant grants should still be removed.
- Multiple permissive policies are OR-combined; a stricter new policy does not override a broad old permissive one. Restrictive policies are intentional additional boundaries.
- Auth expression wrapping/indexing warnings concern query performance; inspect query plans and indexes before mechanical rewrites. They are not equivalent to exposed rows.
- Exact Supabase advisor warnings were not supplied. This audit cannot claim that every displayed warning has been resolved; provide names/text or screenshots without credentials.

## Remaining high-security work

Enforce MFA for administrator access in the actual backend/RLS after providing enrollment/challenge UI. Harden public quotation-response links with separate expiring/revocable tokens and explicit confirmation instead of automatic page-load mutations. Review payment initiation throttling across new-account bursts, server-owned durable order ledger, older entitlement/refund reconciliation, SMTP delivery and provider test/live configuration. Isolate private signatures and other sensitive assets from public buckets. Complete restore drills, alert routing, dependency vulnerability review and the outstanding document preview/data-integrity findings.

The webhook secret appeared in IDE context sent into the conversation. Do not repeat its value or reuse it as another credential. Treat it as disclosed to this conversation and rotate it in both Supabase and Razorpay through a coordinated change; unilaterally changing one side would break deliveries. Local staging files remain ignored, but Git ignore is not an incident response or secret rotation mechanism.

Verdict: the original public data/self-upgrade and unsigned-webhook vulnerabilities are now blocked by tested live controls. The app is materially safer, but it is not yet certified for a high-security paid launch because the confirmed relational boundary and the outstanding verification/design gaps remain.
