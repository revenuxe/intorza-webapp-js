import { describe, expect, it } from '@jest/globals';
import { resolvePublicSupabase } from './resolve-public-supabase.mjs';

const defaults = { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' };
const jwt = (role: string, ref = 'project') => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, ref })).toString('base64url')}.test`;

describe('public Supabase configuration', () => {
  it('uses defaults and accepts a complete override', () => {
    expect(resolvePublicSupabase({}, defaults).source).toBe('public defaults');
    expect(resolvePublicSupabase({ NEXT_PUBLIC_SUPABASE_URL: defaults.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }, defaults).source).toBe('environment');
  });
  it('rejects a partial project override', () => {
    expect(() => resolvePublicSupabase({ NEXT_PUBLIC_SUPABASE_URL: defaults.url }, defaults)).toThrow('together');
  });
  it.each(['sb_secret_test', jwt('service_role'), jwt('authenticated')])('rejects a privileged or user key', key => {
    expect(() => resolvePublicSupabase({}, { ...defaults, publishableKey: key })).toThrow();
  });
  it('rejects a key from another project', () => {
    expect(() => resolvePublicSupabase({}, { ...defaults, publishableKey: jwt('anon', 'other') })).toThrow('different projects');
  });
  it('rejects credentials and unsafe protocols in the URL', () => {
    expect(() => resolvePublicSupabase({}, { ...defaults, url: 'https://user:password@project.supabase.co' })).toThrow();
    expect(() => resolvePublicSupabase({}, { ...defaults, url: 'http://project.supabase.co' })).toThrow();
  });
});
