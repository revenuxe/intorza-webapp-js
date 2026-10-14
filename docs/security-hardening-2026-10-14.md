# Pentest response and prepared security fixes

The user clarified that a pentest found exposure; there is no confirmed third-party breach in this conversation. The anon key is public by design and has the same intended browser role as a publishable key. Replacing one with the other does not close permissive database policies.

## Key inventory

`node scripts/audit-supabase-keys.mjs --history` found public anon JWTs in `.env`, `src/config/public-supabase.json`, and local Git history. No embedded Supabase secret-key or service-role JWT value was found in the scanned files/history. This scanner checks recognizable Supabase formats, not arbitrary secrets, external hosting variables, remote-only history, logs or provider accounts. It never prints credentials. Existing configuration validation rejects secret/service-role keys in browser configuration.

## Prepared changes — not deployed

- `20261014120000_secure_profile_access.sql`: removes anonymous profile grants and the broad public read policy; adds a restrictive owner/admin read boundary; grants only approved business-field updates; denies browser profile insertion and subscription writes. Auth's trusted creation trigger and service-role billing remain functional. `companies_public` deliberately exposes only company ID/name, country and organization code.
- TeamSignup queries that limited directory, retaining company/location/code discovery without owner personal information. The generated directory type is updated.
- `20261014121000_secure_room_photo_objects.sql`: replaces broad room storage policies, adds restrictive bucket boundaries, requires owner-prefixed uploads and new database references, and preserves project/team reads through invoker-rights room-photo RLS. Legacy simple signed/public URLs remain resolvable. It blocks object updates because uploads use unique keys.
- create-team-member-auth verifies the target record belongs to the requesting company, matches the email and is unlinked before creating auth; it also checks Pro entitlement. Conditional linking rechecks ownership/unlinked state and requires a returned row, cleaning up a newly created auth account on conflict.

## Validation

The proposed migrations were applied only within a transaction that was rolled back on the linked database. Synthetic checks passed for anonymous private-profile denial, cross-tenant profile denial, owner settings, denied subscription updates/inserts, service-role billing updates, anonymous/foreign room-object denial, foreign-prefix uploads, forged photo references, legacy owner reads, and assigned-worker reads/uploads. No customer records were read or changed; the transaction left no persistent DDL, grants or test data.

The Next production build and all 78 existing unit tests passed. The new Chromium company-directory case passed, proving signup does not request private profiles. Browser runner teardown may hang in this environment; a passing case is not a completed full-suite run. The team Edge Function source was reviewed but not exercised with live auth-account creation or deployed.

Regenerate and run the rollback check:

```powershell
node scripts/prepare-security-check.mjs
npx --no-install supabase db query --linked --file supabase/checks/.security-preview.sql
```

## Production rollout still required

The live vulnerabilities remain until the migrations are applied. Do not replay divergent old migration history. Apply only these reviewed additive migrations and record their versions, publish the updated frontend and deploy the team Edge Function. Coordinate the directory change: the new frontend needs the new directory columns. Verify anonymous denial and legitimate owner/team flows after rollout using synthetic accounts.

Existing signed photo URLs may remain usable until expiration; policy changes do not promise to invalidate already issued links. Legacy paths containing URL-encoded characters require an inventory/normalization check. Removing a legacy photo's DB reference before storage cleanup may leave an orphan because project-reference authorization then disappears; an owner-prefix uploader can still clean up their own file. A transactional deletion endpoint can address that remaining cleanup limitation.

These fixes do not resolve the separate payment verification/webhook issues, mutable document snapshots, preview/export mismatch or all other findings in the launch audit. They must not be represented as a complete security certification. Review actual pentest findings and rerun the pentest after deployment.
