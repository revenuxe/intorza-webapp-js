# Next.js migration

## Implemented

- All 30 original application routes now have native App Router pages, including
  dynamic `[id]` and `[projectId]` segments. Views moved from `src/pages` to
  `src/views` to avoid accidentally creating a second Next.js Pages Router.
- Workspace and authentication layouts persist during navigation. Shared auth
  state uses one Supabase listener instead of a listener per consumer. Browser
  auth storage and callback paths remain compatible with the existing app.
- Feature navigation uses Next.js history, links, and prefetching through small
  adapters. Search parameters preserve quotation IDs and continued actions.
  Root-relative return URLs are validated before navigating.
  Email sign-in/signup and auth callbacks share a redirect owner so concurrent
  completions cannot consume the return path twice.
- Protected workspace routes wait for auth and retain the requested path before
  sign in. Admin dashboard and PDF QA routes require the existing `is_admin`
  RPC before mounting their tools. Backend access remains enforced by Supabase
  RLS and the existing authenticated Edge Functions.
- Next.js supplies route-level loading, recoverable errors, a real HTTP 404,
  server-generated metadata, and per-route code splitting. Existing branding,
  layout, and the deliberate no-index policy are retained.
- `/quotation/:id` redirects to `/quotations/:id`, and `/create-quotation`
  redirects to the editor at `/`, retaining query strings.
- Browser-dependent quotation editing and PDF QA are lazy client components.
  PDF rendering loads only in the browser, with a same-origin worker matching
  the installed pdf.js version. Other pages can prerender safe UI; account data
  continues to load through the existing Supabase API.
- Subscription state starts without trusting cached Pro status. Late responses
  are discarded after account changes; payment polling is cleaned up. React
  Query's cache is cleared when the authenticated identity changes.
- The install manifest remains available. The replacement `/sw.js` removes
  legacy Workbox caches, caches only `/offline.html`, and never caches Supabase
  data, private pages, or React Server Component responses. An open editor
  retains its current in-memory state during a connection interruption, but
  offline saving and automatic database synchronization are not implemented.
- React 19-compatible calendar, drawer, and theme dependencies are installed.
  npm is the authoritative lockfile. Legacy bundler files and plugins have
  been removed. Jest uses the Next.js compiler for unit tests.
- Preview-specific auth messaging, old client-side SEO/404 code, and editor
  planning artifacts have been removed. Supabase uses standard browser session
  storage. Environment configuration uses only `NEXT_PUBLIC_` names.

## Required before a production rollout

1. Configure the public environment variables in Cloudflare Workers Builds and
   build with Node.js 22.12 or newer. Do not expose backend secrets.
2. Build with `npm run build:cloudflare` and preview in the Workers runtime.
   Follow [the Cloudflare guide](cloudflare-deployment.md) before publishing.
3. Keep production/staging auth callback origins in Supabase's redirect
   allowlist, including `/auth` and `/team/login`. The current integration
   retains browser sessions; it does not introduce cookie-based server auth.
4. Verify with a staging tenant: Google and email sign in, sign out, onboarding,
   quotation draft continuation, create/update/PDF exports, invoices, payments,
   gallery uploads, site measurements, team permissions, and admin permissions.
5. Use Razorpay test mode to verify subscription creation, payment verification,
   webhook delivery, and the return to `/payment-processing`. Browser mocks
   confirm integration wiring, not live provider configuration or billing.
6. Test existing installed PWAs after updating: the new worker should replace
   the old one and remove legacy API caches. Private data must not be available
   from another account's offline cache.

The repository migration does not apply database migrations, redeploy Edge
Functions, change hosted domains, or publish to a hosting account. Existing
Supabase RLS and payment authorization still need normal production review;
frontend route guards are not a substitute for backend authorization.

## Verification commands

`npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
Playwright checks mock external services, use synthetic credentials, and never
perform live payment or database writes. The production build must exist first.
