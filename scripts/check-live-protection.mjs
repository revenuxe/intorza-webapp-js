import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config=resolvePublicSupabase(process.env);
for (const [name,path,body,extra] of [
  ['signup without CAPTCHA','/auth/v1/signup',{email:'security-check@example.invalid',password:'Synthetic-check-only-93'},{}],
  ['password login without CAPTCHA','/auth/v1/token?grant_type=password',{email:'security-check@example.invalid',password:'Synthetic-check-only-93'},{}],
  ['unsigned webhook','/functions/v1/razorpay-webhook',{},{}],
  ['incorrectly signed webhook','/functions/v1/razorpay-webhook',{}, {'x-razorpay-signature':'0'.repeat(64)}],
]) {
  const response=await fetch(config.url+path,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  const captchaDenied=String(data.msg||data.message||data.error_description||'').toLowerCase().includes('captcha') || String(data.error_code||data.code||'').includes('captcha');
  const passed=name.includes('CAPTCHA')?captchaDenied:[400,401,403].includes(response.status);
  console.log(JSON.stringify({check:name,status:response.status,captchaRejection:captchaDenied,passed}));
  if (!passed) process.exitCode=1;
}
