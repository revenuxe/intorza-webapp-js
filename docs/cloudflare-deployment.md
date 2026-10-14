# Deploy INTORZA to Cloudflare Workers

The app uses Next.js 16.3.8 and the OpenNext Cloudflare adapter. The generated
Worker serves dynamic App Router routes; Cloudflare's asset binding serves
the static files. Uploads, database access, authentication, and payment Edge
Functions remain in Supabase. The app has no separate storage or API backend
on another hosting provider.

## Build and preview

Use Node.js 22.12 or newer. Copy `.env.example` to an ignored `.env.local`
and configure your project's public URL/key before building locally:

```sh
npm ci
npm test
npm run build:cloudflare
npm run preview
```

`build:cloudflare` invokes the adapter, which runs the Next.js build and writes
`.open-next/worker.js` and `.open-next/assets`. `preview` serves that output
locally in Cloudflare's workerd runtime. Build before previewing; `next dev`
is for ordinary local development and does not verify Workers compatibility.
Run `npm run test:e2e:cloudflare` after the Cloudflare build to execute the
browser regression checks against the actual Workers runtime. Use
`npm run deploy:dry-run` to validate packaging without publishing anything.

Native Windows support depends on the installed adapter and runtime versions.
Use a Linux build environment or WSL if a native Windows adapter build fails.

## Public build variables

There is no checked-in URL/key fallback. Set both Supabase values in
Cloudflare Workers Builds before building; a missing pair fails the build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — the final HTTPS application origin

These values are embedded in browser assets at build time. Runtime secrets
cannot replace missing public build variables. Supabase service-role and
Razorpay secrets remain in the existing Supabase Edge Function environment.
For local preview, `.dev.vars` may contain `NEXTJS_ENV=development`; use
`.dev.vars.example` as a starting point. Without it, preview loads production
Next.js environment files.

## Publish

```sh
npx wrangler login
npm run deploy
```

`deploy` runs `build:cloudflare` through its `predeploy` hook, then publishes
the worker named `intorza-webapp-js`. The self-reference service binding must
use this same name. Choose the intended Cloudflare account when authenticating.
For CI, set `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in the build system's secret settings.

In Workers Builds use build command `npm run build` and deploy
command `npx opennextjs-cloudflare deploy` to avoid building twice. Root
directory is this repository. This is a Workers application with a bundled
asset binding, rather than a static Pages upload.
`npm run build` and `npm run build:cloudflare` both generate the Worker.
The adapter invokes `npm run build:next` internally. Keep the deploy command
as `npx opennextjs-cloudflare deploy` so it uses the adapter's deployment flow.

The `workers_dev` and `preview_urls` settings are disabled to match the
existing custom-domain Worker configuration. No
R2 cache binding is configured because the app loads tenant data directly
from Supabase and does not use ISR or on-demand server revalidation. Add an
appropriate cache binding before introducing those server caching features.

OpenNext's Cloudflare adapter uses shared OpenNext implementation packages
internally. Those transitive build dependencies do not configure a separate
hosting account or send this app's data to another provider.
In particular, `@opennextjs/aws` is required internally by the Cloudflare
adapter; it is not an application deployment target or storage integration.
Next.js is pinned to the compatible 16.3 patch series because the tested
adapter does not handle the new preview-props manifest from 16.4.

## Release checks

Update Supabase's auth redirect allowlist for the deployed origin's `/auth`
and `/team/login` URLs. In staging, verify email and Google sign in, admin
and team permissions, file uploads, PDF preview/download, quotation links,
and Razorpay test-mode checkout/webhooks. Check an existing installed PWA
after upgrading. Repository cleanup does not alter hosted resources or
publish without running the deploy command.

Implementation reference: [OpenNext Cloudflare setup](https://opennext.js.org/cloudflare/get-started).
