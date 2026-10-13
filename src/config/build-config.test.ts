import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

describe('Cloudflare build configuration', () => {
  it('packages a Worker without recursively invoking the default build', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toBe('opennextjs-cloudflare build');
    expect(pkg.scripts['build:next']).toBe('next build');
    expect(fs.readFileSync(path.join(root, 'open-next.config.ts'), 'utf8')).toContain("buildCommand: 'npm run build:next'");
  });
  it('ships only a browser-safe default key', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'src/config/public-supabase.json'), 'utf8'));
    expect(new URL(config.url).protocol).toBe('https:');
    if (!config.publishableKey.startsWith('sb_publishable_')) {
      const claims = JSON.parse(Buffer.from(config.publishableKey.split('.')[1], 'base64url').toString());
      expect(claims.role).toBe('anon');
      expect(new URL(config.url).hostname).toBe(`${claims.ref}.supabase.co`);
    }
  });
});
