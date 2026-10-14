# INTORZA

INTORZA runs on Next.js 16 App Router, React 19, TypeScript, Tailwind CSS,
shadcn/ui, TanStack Query, and Supabase. Quotations, invoices, measurements,
team management, PDF generation, and Razorpay subscription workflows retain
their existing Supabase integrations.

## Local development

Use Node.js 22.12 or later and npm. The current project's browser-safe
Supabase configuration is included. To use another project, copy `.env.example`
to `.env.local` and override both the public URL and publishable/anon key.

```sh
npm ci
npm run dev
```

The app serves at `http://localhost:8080`. Public environment variables are
embedded at build time. Never put a Supabase service-role key, Razorpay
secret, or any backend credential in a `NEXT_PUBLIC_` variable.

## Verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests use the production build on port 3100 and mock external
integrations; they never write to the live database or charge payments.
`npm run build` produces the Cloudflare Worker and the Next.js output used by
browser tests. Jest uses Next.js's compiler for unit tests.

## Cloudflare Workers deployment

```sh
npm run build:cloudflare
npm run preview
```

The app deploys to Cloudflare Workers through `@opennextjs/cloudflare` and
Wrangler. `wrangler.jsonc` binds the generated worker and static assets in
`.open-next/`; `open-next.config.ts` configures the adapter. Set the public
Supabase variables and `NEXT_PUBLIC_SITE_URL` in your Workers Builds environment
before building. The PDF worker is copied from the installed pdf.js package.

After authenticating your Cloudflare account, publish with `npm run deploy`.
The deploy script builds the worker first. See
[the Cloudflare deployment guide](docs/cloudflare-deployment.md) for setup,
CI commands, environment variables, and verification. This setup uses the
existing Next.js compiler and has no Vite dependency.

Supabase database migrations, RLS policies, storage, and Edge Functions
remain in `supabase/`. Razorpay subscription creation, verification, and
webhooks continue to run in those functions; their secrets stay there.
Keep the deployed origin's `/auth` and `/team/login` URLs in Supabase's
allowed auth redirect URLs. The current origin remains the OAuth callback
target, so a hosting domain change requires updating that allowlist.

## Migration details and rollout

See [Supabase integration](docs/supabase-integration.md) for connection checks,
CLI linking, the schema inventory, and remaining database rollout work.

See [the migration guide](docs/nextjs-migration.md) for the routing,
authentication, offline behavior, and release verification requirements.
