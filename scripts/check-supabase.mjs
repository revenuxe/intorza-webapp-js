import fs from 'node:fs';
import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';

nextEnv.loadEnvConfig(process.cwd());
const config = resolvePublicSupabase(process.env);
const project = fs.readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8').match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
const linkedFile = new URL('../supabase/.temp/project-ref', import.meta.url);
const linked = fs.existsSync(linkedFile) ? fs.readFileSync(linkedFile, 'utf8').trim() : null;
console.log(`Supabase configuration: ${config.source}; host: ${new URL(config.url).hostname}`);
console.log(`CLI linked: ${linked ? (linked === project ? 'yes, matches config.toml' : 'different project') : 'no; run npm run supabase:link'}`);
if (new URL(config.url).hostname.endsWith('.supabase.co') && new URL(config.url).hostname !== `${project}.supabase.co`) {
  throw new Error('Browser project does not match supabase/config.toml.');
}
if (linked && linked !== project) throw new Error('CLI link does not match supabase/config.toml.');
if (process.argv.includes('--online')) {
  // Auth settings expose provider configuration, not customer records.
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.publishableKey, ...(!config.publishableKey.startsWith('sb_publishable_') ? { Authorization: `Bearer ${config.publishableKey}` } : {}) }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Supabase Auth connection failed (HTTP ${response.status}).`);
  const settings = await response.json();
  console.log(`Auth reachable; email provider: ${Boolean(settings.external?.email)}; Google provider: ${Boolean(settings.external?.google)}`);
  // Request zero rows. The anonymous role may intentionally lack table grants.
  // The API root requires a secret key on hardened projects, so avoid it.
  const rest = await fetch(`${config.url}/rest/v1/clients?select=id&limit=0`, {
    headers: { apikey: config.publishableKey, ...(!config.publishableKey.startsWith('sb_publishable_') ? { Authorization: `Bearer ${config.publishableKey}` } : {}) }, signal: AbortSignal.timeout(15_000),
  });
  const result = await rest.json();
  const denied = [401, 403].includes(rest.status) && result.code === '42501';
  if (!rest.ok && !denied) throw new Error(`Supabase Data API connection failed (HTTP ${rest.status}).`);
  console.log(`Data API reachable; anonymous client access: ${denied ? 'denied by database permissions' : 'accepted under RLS'}.`);
}
