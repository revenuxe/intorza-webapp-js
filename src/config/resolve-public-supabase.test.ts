import { describe, expect, it } from '@jest/globals';
import { resolvePublicSupabase } from './resolve-public-supabase.mjs';

const defaults = { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' };
const configured = (overrides: Partial<typeof defaults> = {}) => ({
  NEXT_PUBLIC_SUPABASE_URL: overrides.url ?? defaults.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: overrides.publishableKey ?? defaults.publishableKey,
});
const jwt = (role: string, ref = 'project') => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, ref })).toString('base64url')}.test`;

describe('public Supabase configuration', () => {
  it('requires environment configuration and accepts public keys', () => {
    expect(() => resolvePublicSupabase({})).toThrow('no embedded defaults');
    expect(resolvePublicSupabase(configured()).source).toBe('environment');
    expect(resolvePublicSupabase(configured({ publishableKey: jwt('anon') })).source).toBe('environment');
  });
  it('rejects a partial project override', () => {
    expect(() => resolvePublicSupabase({ NEXT_PUBLIC_SUPABASE_URL: defaults.url })).toThrow('together');
  });
  it.each(['sb_secret_test', jwt('service_role'), jwt('authenticated')])('rejects a privileged or user key', key => {
    expect(() => resolvePublicSupabase(configured({ publishableKey: key }))).toThrow();
  });
  it('rejects a key from another project', () => {
    expect(() => resolvePublicSupabase(configured({ publishableKey: jwt('anon', 'other') }))).toThrow('different projects');
  });
  it('rejects credentials and unsafe protocols in the URL', () => {
    expect(() => resolvePublicSupabase(configured({ url: 'https://user:password@project.supabase.co' }))).toThrow();
    expect(() => resolvePublicSupabase(configured({ url: 'http://project.supabase.co' }))).toThrow();
  });
});
