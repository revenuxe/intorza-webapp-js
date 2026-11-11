export const PORTAL_HOSTS = { app: 'app.intorza.com', team: 'team.intorza.com', admin: 'admin.intorza.com' };

export function portalForPath(pathname) {
  if (/^\/team\/(?:login|signup|dashboard)(?:\/|$)/.test(pathname)) return 'team';
  if (/^\/admin(?:\/|$)/.test(pathname)) return 'admin';
  return 'app';
}

export function cleanPortalPath(path, portal) {
  return portal === 'team' ? path.replace(/^\/team(?=\/)/, '')
    : portal === 'admin' ? path.replace(/^\/admin(?=\/)/, '') : path;
}

// Development and previews keep same-origin routing. Production portals use
// separate origins and separate browser storage; no tokens travel in URLs.
export function portalHref(path, hostname) {
  if (!Object.values(PORTAL_HOSTS).includes(hostname)) return path;
  const pathname = path.split(/[?#]/)[0];
  const currentPortal = hostname === PORTAL_HOSTS.team ? 'team' : hostname === PORTAL_HOSTS.admin ? 'admin' : 'app';
  const isCleanPath = /^\/(?:login|dashboard)(?:\/|$)/.test(pathname)
    || (currentPortal === 'team' && pathname === '/signup')
    || (currentPortal === 'admin' && pathname === '/pdf-qa');
  const portal = currentPortal !== 'app' && isCleanPath ? currentPortal : portalForPath(pathname);
  const target = PORTAL_HOSTS[portal];
  const cleanPath = cleanPortalPath(path, portal);
  return target === hostname ? cleanPath : 'https://' + target + cleanPath;
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
    if (pathname === '/') return redirect(hostname, '/login');
    if (portalForPath(pathname) === 'team') return redirect(hostname, cleanPortalPath(pathname, 'team'));
    if (pathname === '/login' || pathname === '/signup' || /^\/dashboard(?:\/|$)/.test(pathname)) return null;
    return redirect(hostname, '/dashboard');
  }
  if (hostname === PORTAL_HOSTS.admin) {
    if (pathname === '/') return redirect(hostname, '/login');
    if (portalForPath(pathname) === 'admin') return redirect(hostname, pathname === '/admin' ? '/dashboard' : cleanPortalPath(pathname, 'admin'));
    if (pathname === '/login' || pathname === '/pdf-qa' || /^\/dashboard(?:\/|$)/.test(pathname)) return null;
    return redirect(hostname, '/dashboard');
  }
  const portal = portalForPath(pathname);
  if (portal !== 'app') return redirect(PORTAL_HOSTS[portal], cleanPortalPath(pathname, portal));
  return null;
}
