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
  it('contains no checked-in Supabase credential fallback', () => {
    expect(fs.existsSync(path.join(root, 'src/config/public-supabase.json'))).toBe(false);
    const config = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8');
    expect(config).toContain('resolvePublicSupabase(process.env)');
    expect(config).not.toContain('public-supabase.json');
  });
});
