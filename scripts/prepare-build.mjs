import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';

nextEnv.loadEnvConfig(process.cwd());
try {
  resolvePublicSupabase(process.env);
} catch (error) {
  console.error('Build configuration is incomplete or invalid. Credential values are never printed.');
  console.error(error instanceof Error ? error.message : 'Invalid public Supabase configuration.');
  console.error('Cloudflare: Workers & Pages → intorza-webapp-js → Settings → Build → Variables and secrets.');
  console.error('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the BUILD environment. Runtime Worker bindings are separate.');
  console.error('Also configure NEXT_PUBLIC_TURNSTILE_SITE_KEY for the production CAPTCHA integration.');
  process.exit(1);
}
await import('./prepare-pdf-worker.mjs');
console.log('Public build configuration validated; PDF worker prepared.');
