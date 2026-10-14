# Bot protection

The production Worker limits dynamic requests to 120 per 60 seconds per
Cloudflare-provided client IP. Static assets are excluded so a rate limit does
not prevent the browser from loading its application scripts. Rejections return
429, Retry-After: 60 and Cache-Control: no-store. Missing/failed limiter bindings
return 503 for edge clients. Internal service requests without a Cloudflare
client IP are exempt; caller-provided X-Forwarded-For is never used.

Cloudflare's binding uses approximate counters per Cloudflare location, not a
global transaction counter. Shared office networks share a budget. Monitor 429
rates and tune the limit if ordinary users encounter it. This does not stop a
distributed botnet or protect the Supabase hostname.

Supabase authentication independently enforces CAPTCHA and email confirmation.
Payment creation/verification and team-account creation have persistent
per-user database limits. Direct Supabase traffic must continue to be protected
at Supabase; app-domain WAF rules cannot cover another provider's hostname.

Cloudflare dashboard controls remain unverified because the current CLI login
cannot read WAF/bot settings. In the dashboard, review Security bot protection,
enable available managed WAF rules, and review security events before adding
aggressive challenges. Keep challenges away from static assets and provider
webhooks. Do not apply blanket bot-score rules without confirming plan support.

Reference: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
