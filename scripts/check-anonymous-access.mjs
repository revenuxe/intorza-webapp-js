import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config = resolvePublicSupabase(process.env);
let exposed = false;
for (const table of ['profiles', 'clients', 'invoices', 'quotations', 'feedback', 'team_members', 'payments']) {
  try {
    // HEAD retrieves no customer fields or response body. Print no row counts.
    const response = await fetch(`${config.url}/rest/v1/${table}?select=id`, {
      method: 'HEAD',
      headers: { apikey: config.publishableKey, ...(!config.publishableKey.startsWith('sb_publishable_') ? { Authorization: `Bearer ${config.publishableKey}` } : {}), Prefer: 'count=exact', Range: '0-0' },
      signal: AbortSignal.timeout(15000),
    });
    const range = response.headers.get('content-range');
    const count = range?.match(/\/(\d+)$/)?.[1];
    const visible = response.ok && count !== undefined && Number(count) > 0;
    const verdict = visible ? 'EXPOSED: anonymous rows visible' : [401, 403].includes(response.status) ? 'DENIED' : response.ok && count === '0' ? 'NO ANONYMOUS ROWS VISIBLE' : 'INCONCLUSIVE';
    console.log(`${table}: HTTP ${response.status}; ${verdict}`);
    exposed ||= visible;
    if (verdict === 'INCONCLUSIVE') process.exitCode = 2;
  } catch {
    console.log(`${table}: INCONCLUSIVE: request failed`);
    process.exitCode = 2;
  }
}
if (exposed) process.exitCode = 1;
