import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config = resolvePublicSupabase(process.env);
for (const endpoint of ['razorpay-create-subscription', 'razorpay-verify-payment', 'razorpay-cancel-subscription', 'subscription-status']) {
  for (const mode of ['missing-token', 'invalid-token', 'public-key-as-token']) {
    const headers = { apikey: config.publishableKey, 'Content-Type': 'application/json' };
    if (mode !== 'missing-token') headers.Authorization = `Bearer ${mode === 'invalid-token' ? 'invalid-security-test-token' : config.publishableKey}`;
    try {
      const response = await fetch(`${config.url}/functions/v1/${endpoint}`, {
        method: 'POST', headers, body: '{}', signal: AbortSignal.timeout(15000),
      });
      console.log(`${endpoint}: ${mode}: HTTP ${response.status}; ${[401,403].includes(response.status) ? 'DENIED' : 'REVIEW REQUIRED'}`);
      if (![401,403].includes(response.status)) process.exitCode = 1;
      await response.body?.cancel();
    } catch {
      console.log(`${endpoint}: ${mode}: request failed; INCONCLUSIVE`);
      process.exitCode = 2;
    }
  }
}
