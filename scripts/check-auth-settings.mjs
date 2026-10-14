import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config = resolvePublicSupabase(process.env);
const response = await fetch(`${config.url}/auth/v1/settings`, {
  headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Auth settings request failed: HTTP ${response.status}`);
const settings = await response.json();
console.log(JSON.stringify({
  signupDisabled: settings.disable_signup ?? 'not exposed',
  emailAutoConfirmed: settings.mailer_autoconfirm ?? 'not exposed',
  emailProvider: settings.external?.email ?? 'not exposed',
  googleProvider: settings.external?.google ?? 'not exposed',
  anonymousSignIn: settings.external?.anonymous_users ?? 'not exposed',
  captchaNote: 'CAPTCHA enforcement, auth rate limits, MFA policy and redirect allowlist require privileged configuration inspection; public settings do not establish them.',
}, null, 2));
