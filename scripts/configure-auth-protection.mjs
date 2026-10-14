import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const secret = fs.readFileSync('.security-audit-readonly/turnstile-secret.env','utf8').match(/^TURNSTILE_SECRET=(.+)$/m)?.[1];
if (!secret) throw new Error('Turnstile secret has not been staged.');
const directory = '.security-audit-readonly/auth-hardening';
fs.mkdirSync(`${directory}/supabase`, { recursive: true });
fs.writeFileSync(`${directory}/supabase/config.toml`, `project_id = "gclsgkhtwqurniitfeir"
[auth]
additional_redirect_urls = ["https://app.intorza.com", "https://app.intorza.com/auth", "https://app.intorza.com/team/login"]
[auth.email]
enable_confirmations = true
[auth.captcha]
enabled = true
provider = "turnstile"
secret = "env(TURNSTILE_SECRET)"
`);
const apply = process.argv.includes('--apply');
const command = `npx --no-install supabase config ${apply ? 'push' : 'diff'} --project-ref gclsgkhtwqurniitfeir --workdir .security-audit-readonly/auth-hardening --output-format json${apply ? ' --yes' : ''}`;
const result = spawnSync('powershell.exe', ['-NoProfile','-Command',command], {
  encoding:'utf8', env:{ ...process.env, TURNSTILE_SECRET:secret }, timeout:60000,
});
const safe = (result.stdout + result.stderr).replaceAll(secret,'[REDACTED]');
console.log(safe);
if (result.error) console.log('Configuration operation did not complete; credential values suppressed.');
process.exitCode=result.status ?? 1;
