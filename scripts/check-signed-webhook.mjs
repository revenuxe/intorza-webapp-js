import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import nextEnv from '@next/env';
import { resolvePublicSupabase } from '../src/config/resolve-public-supabase.mjs';
nextEnv.loadEnvConfig(process.cwd());
const config=resolvePublicSupabase(process.env);
const secret=fs.readFileSync('.security-audit-readonly/razorpay-webhook.env','utf8').match(/^RAZORPAY_WEBHOOK_SECRET=(.+)$/m)?.[1];
if (!secret) throw new Error('Local webhook secret unavailable; no values printed.');
// Unknown event stops before DB/provider access. Never simulate payment capture.
const body=JSON.stringify({event:'security.non_mutating_probe'});
const response=await fetch(`${config.url}/functions/v1/razorpay-webhook`,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey,'x-razorpay-signature':createHmac('sha256',secret).update(body).digest('hex')},body,signal:AbortSignal.timeout(15000)});
const result=await response.json();
const passed=response.status===200 && result.received===true && result.processed===false;
console.log(JSON.stringify({signedNonMutatingProbePassed:passed,status:response.status,providerDashboardMatch:'not established by this test'}));
if (!passed) process.exitCode=1;
