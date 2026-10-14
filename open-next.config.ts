import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Account data is fetched directly from Supabase; no ISR cache binding is needed.
export default {
  ...defineCloudflareConfig(),
  // Keep the adapter's inner Next.js build separate from the default Worker
  // build so Cloudflare's standard `npm run build` cannot recurse.
  buildCommand: 'npm run build:next',
};
