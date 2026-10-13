import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Account data is fetched directly from Supabase; no ISR cache binding is needed.
export default defineCloudflareConfig();
