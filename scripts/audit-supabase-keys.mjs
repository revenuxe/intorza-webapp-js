import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// Report locations and key classes only. Never print credential values.
const paths = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
for (const name of ['.env', '.env.local', '.env.production', '.dev.vars']) {
  if (fs.existsSync(name)) paths.add(name);
}
if (process.argv.includes('--assets')) {
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(js|mjs|json|html|map)$/.test(entry.name)) paths.add(path);
    }
  }
  walk('.open-next/assets');
}
let privileged = 0;
function inspect(content, location) {
  content.split(/\r?\n/).forEach((line, index) => {
    const kinds = new Set();
    for (const match of line.matchAll(/rzp_(?:live|test)_[A-Za-z0-9]{10,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      const key = match[0];
      let kind;
      if (key.startsWith('rzp_')) kind = 'public Razorpay Key ID';
      else if (key.startsWith('AIza')) kind = 'GOOGLE API KEY: restrictions require review';
      else if (key.startsWith('AKIA')) kind = 'AWS ACCESS KEY ID: paired secret requires review';
      else if (key.startsWith('sb_secret_')) kind = 'SECRET KEY';
      else if (key.startsWith('sb_publishable_')) kind = 'public publishable key';
      else {
        try {
          const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
          kind = claims.role === 'service_role' ? 'SERVICE ROLE JWT' : claims.role === 'anon' ? 'public anon JWT' : 'other JWT';
        } catch { continue; }
      }
      kinds.add(kind);
    }
    for (const kind of kinds) {
      console.log(`${location}:${index + 1}: ${kind}`);
      if (kind === 'SECRET KEY' || kind === 'SERVICE ROLE JWT') privileged++;
    }
  });
}
for (const path of paths) {
  if (!fs.existsSync(path) || !fs.statSync(path).isFile() || fs.statSync(path).size > 4_000_000) continue;
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('\0')) inspect(content, path);
}
if (process.argv.includes('--history')) {
  const history = execFileSync('git', ['log', '--all', '--format=commit %h', '-p', '--', '.', ':!package-lock.json'], { encoding: 'utf8', maxBuffer: 100_000_000 });
  let commit = '', path = '';
  for (const line of history.split(/\r?\n/)) {
    if (line.startsWith('commit ')) commit = line;
    if (line.startsWith('+++ b/')) path = line.slice(6);
    if (line.startsWith('+') && !line.startsWith('+++')) inspect(line.slice(1), `history ${commit} ${path}`);
  }
}
console.log(`Privileged key occurrences: ${privileged}. Values suppressed. Test fixtures require manual classification.`);
process.exitCode = privileged ? 1 : 0;
