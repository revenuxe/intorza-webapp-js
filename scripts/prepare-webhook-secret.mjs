import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
const file='.security-audit-readonly/razorpay-webhook.env';
fs.mkdirSync('.security-audit-readonly',{recursive:true});
if (!fs.existsSync(file)) fs.writeFileSync(file,`RAZORPAY_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}\n`,{mode:0o600});
console.log('A strong webhook secret is staged in the ignored local webhook env file. Its value has not been printed. Install the same value in Razorpay after Supabase configuration.');
