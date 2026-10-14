import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Keep provider secrets in ignored files only; never log CLI JSON responses.
function wrangler(args) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args, '--json'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Turnstile CLI operation failed; raw output suppressed to protect credentials.');
  try { return JSON.parse(result.stdout); } catch { throw new Error('Turnstile CLI returned unexpected output; raw output suppressed.'); }
}
const widgets = wrangler(['turnstile','widget','list']);
const existing = widgets.find(widget => widget.name === 'INTORZA Auth Production');
const widget = existing
  ? wrangler(['turnstile','widget','get',existing.sitekey])
  : wrangler(['turnstile','widget','create','INTORZA Auth Production', '--domain','app.intorza.com','--mode','managed']);
if (!widget.sitekey || !widget.secret) throw new Error('Provider did not return the expected key pair; no values logged.');
fs.mkdirSync('.security-audit-readonly', { recursive: true });
fs.writeFileSync('.security-audit-readonly/turnstile-secret.env', `TURNSTILE_SECRET=${widget.secret}\n`, { mode: 0o600 });
const localPath = '.env.local';
const previous = fs.existsSync(localPath) ? fs.readFileSync(localPath, 'utf8') : '';
const next = previous.replace(/^NEXT_PUBLIC_TURNSTILE_SITE_KEY=.*\r?\n?/gm, '');
fs.writeFileSync(localPath, next.trimEnd() + `\nNEXT_PUBLIC_TURNSTILE_SITE_KEY=${widget.sitekey}\n`);
console.log('Production Turnstile widget ready for app.intorza.com. Public site key saved in ignored .env.local; private secret staged in ignored audit storage. Values suppressed.');
