export const PORTAL_HOSTS = { app: 'app.intorza.com', team: 'team.intorza.com', admin: 'admin.intorza.com' };

export function portalForPath(pathname) {
  if (/^\/team\/(?:login|signup|dashboard)(?:\/|$)/.test(pathname)) return 'team';
  if (/^\/admin(?:\/|$)/.test(pathname)) return 'admin';
  return 'app';
}

// Development and previews keep same-origin routing. Production portals use
// separate origins and separate browser storage; no tokens travel in URLs.
export function portalHref(path, hostname) {
  if (!Object.values(PORTAL_HOSTS).includes(hostname)) return path;
  const target = PORTAL_HOSTS[portalForPath(path.split(/[?#]/)[0])];
  return target === hostname ? path : 'https://' + target + path;
}

export function routePortalRequest(request) {
  const url = new URL(request.url);
  const { hostname, pathname } = url;
  if (!Object.values(PORTAL_HOSTS).includes(hostname)) return null;
  const redirect = (host, path) => new Response(null, { status: 307, headers: {
    Location: 'https://' + host + path + url.search + url.hash,
    'Cache-Control': 'private, no-store',
  } });
  // Framework assets and the service worker are scoped to the current origin.
  if (pathname.startsWith('/_next/') || pathname.startsWith('/icons/')
      || ['/sw.js', '/manifest.json', '/manifest.webmanifest', '/offline.html', '/offline', '/favicon.ico', '/placeholder.svg', '/pdf.worker.min.mjs', '/quotation-audio-worklet.js', '/robots.txt', '/sitemap.xml'].includes(pathname)) return null;
  if (pathname.startsWith('/api/')) {
    if (hostname === PORTAL_HOSTS.team || (hostname === PORTAL_HOSTS.admin && !pathname.startsWith('/api/admin/'))) {
      return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return null;
  }
  if (hostname === PORTAL_HOSTS.team) {
    if (pathname === '/' || pathname === '/login') return redirect(hostname, '/team/login');
    if (pathname === '/signup') return redirect(hostname, '/team/signup');
    if (pathname === '/dashboard') return redirect(hostname, '/team/dashboard');
    if (portalForPath(pathname) !== 'team') return redirect(hostname, '/team/dashboard');
    return null;
  }
  if (hostname === PORTAL_HOSTS.admin) {
    if (pathname === '/' || pathname === '/login') return redirect(hostname, '/admin/login');
    if (pathname === '/dashboard') return redirect(hostname, '/admin/dashboard');
    if (portalForPath(pathname) !== 'admin') return redirect(hostname, '/admin/dashboard');
    return null;
  }
  const portal = portalForPath(pathname);
  if (portal !== 'app') return redirect(PORTAL_HOSTS[portal], pathname);
  return null;
}
