# Supabase integration

## Structure

- `src/config/resolve-public-supabase.mjs`: build-time public configuration
  validation. URL/key overrides must be provided together; privileged keys
  and legacy anon keys from another project are rejected.
- `src/integrations/supabase/client.ts`: shared browser client. Auth sessions
  remain in browser storage; protected server data must not rely on this
  browser session for server authorization.
- `src/integrations/supabase/types.ts`: application database types.
- `src/hooks/useAuth.tsx`: shared authentication state.
- `src/lib/api.ts`: data operations using the signed-in user's JWT and RLS.
- `src/lib/storageUpload.ts`: uploads to the existing Supabase buckets.
- `supabase/functions`: payment/team operations with server-only secrets.
- `supabase/migrations`: local SQL history, requiring reconciliation before push.
- `supabase/checks/integration.sql`: repeatable read-only schema inventory.

Use exactly `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Cloudflare's build environment.
The public defaults support a clean build; the environment takes precedence.
Changing a build variable requires rebuilding. CLI login is independent of
browser auth; project linking is local ignored state and is not sent to GitHub.

## Verified on October 13, 2026

Project `gclsgkhtwqurniitfeir` (Intorza) is active and healthy. This checkout
is linked to it. The configured browser key successfully reads Auth settings;
email and Google providers are enabled. All 30 public tables have RLS enabled
and policies present. This inventory does not prove that every policy enforces
the intended tenant boundary. Required `is_admin` and `respond_to_quotation`
RPCs and `profiles.hero_image_url` exist. Storage buckets `company-logos` and
`gallery-images` are public, while `room-photos` is private. The six locally
defined Edge Functions are deployed and active. The security advisor reported
no error-level findings.

## Commands

```sh
npm run supabase:check
npm run supabase:check:online
npm run supabase:link
npm run supabase:migrations
npm run supabase:inspect
```

CLI commands require an installed/logged-in Supabase CLI available to npx.
Check/inspect commands do not read tenant records or apply SQL migrations.

## Remaining rollout work

The remote migration history differs from local filenames, often by seconds,
and includes remote-only migrations. Do not run `supabase db push` or repair
history based on timestamps alone. Retrieve and compare the remote SQL, then
reconcile an approved baseline. Required features already exist remotely;
their presence does not establish equivalence of all local migrations.

Remote functions `uploadToS3` and `s3-upload` still exist. The current app
does not call them. Confirm that no other clients depend on them before
deleting them; this change does not delete remote functions or storage.

Local Razorpay webhook code now rejects missing secrets/signatures and checks
HMAC with Web Crypto verification before accessing the database. This source
fix requires a separate Edge Function deployment and Razorpay test-mode check;
publishing the Cloudflare frontend does not deploy Supabase functions.

Set the deployed app origin's `/auth` and `/team/login` in Supabase's allowed
redirect URLs. A successful provider-settings check does not test Google OAuth
callback configuration, payment webhooks, or real tenant permissions.
