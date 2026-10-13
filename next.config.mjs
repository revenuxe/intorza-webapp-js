import { readFileSync } from 'node:fs';
import { resolvePublicSupabase } from './src/config/resolve-public-supabase.mjs';

const publicSupabase = JSON.parse(readFileSync(new URL('./src/config/public-supabase.json', import.meta.url), 'utf8'));
const resolvedSupabase = resolvePublicSupabase(process.env, publicSupabase);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvedSupabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvedSupabase.publishableKey,
  },
  async redirects() {
    return [
      { source: '/quotation/:id', destination: '/quotations/:id', permanent: false },
      { source: '/create-quotation', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ];
  },
};
export default nextConfig;
