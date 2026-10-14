/* Cache the public offline screen only. Never cache account data or RSC responses. */
const CACHE = 'intorza-offline-v2';
const OFFLINE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Remove caches left by the previous Workbox service worker.
    const legacy = /^(workbox-|google-fonts-cache$|gstatic-fonts-cache$|images-cache$|api-cache$|intorza-offline-)/;
    for (const name of await caches.keys()) {
      if (name !== CACHE && legacy.test(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => {
    const offline = await caches.match(OFFLINE);
    // Asset hosts may redirect .html URLs to their canonical path. A cached
    // redirected Response is invalid for an offline navigation with redirect
    // mode "manual"; return its body as a fresh response instead.
    return offline
      ? new Response(offline.body, { status: 200, headers: offline.headers })
      : new Response('You are offline. Reconnect and try again.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
