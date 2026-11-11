import { resolvePublicSupabase } from './src/config/resolve-public-supabase.mjs';

const resolvedSupabase = resolvePublicSupabase(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvedSupabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvedSupabase.publishableKey,
  },
  async rewrites() {
    const team = [{ type: 'host', value: 'team\\.intorza\\.com' }];
    const admin = [{ type: 'host', value: 'admin\\.intorza\\.com' }];
    return { beforeFiles: [
      { source: '/login', has: team, destination: '/team/login' },
      { source: '/signup', has: team, destination: '/team/signup' },
      { source: '/dashboard/:path*', has: team, destination: '/team/dashboard/:path*' },
      { source: '/login', has: admin, destination: '/admin/login' },
      { source: '/dashboard/:path*', has: admin, destination: '/admin/dashboard/:path*' },
      { source: '/pdf-qa', has: admin, destination: '/admin/pdf-qa' },
    ], afterFiles: [], fallback: [] };
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
