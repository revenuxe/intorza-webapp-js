// Cloudflare supplies CF-Connecting-IP at the edge. Never use caller-supplied
// X-Forwarded-For or user-agent strings as a security identity.
export async function protectAppRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (path.startsWith('/_next/static/') || path === '/sw.js' ||
      /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|pdf)$/i.test(path)) return null;
  const ip = request.headers.get('CF-Connecting-IP');
  // Local previews and internal service requests have no edge client identity.
  if (!ip) return null;
  if (!env.APP_REQUEST_LIMITER) {
    console.error('App request limiter binding is unavailable');
    return new Response('Temporarily unavailable. Please try again.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
  try {
    const { success } = await env.APP_REQUEST_LIMITER.limit({ key: `app:${ip}` });
    if (success) return null;
    return new Response('Too many requests. Please wait a minute and try again.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  } catch {
    console.error('App request limiter could not be checked');
    return new Response('Temporarily unavailable. Please try again.', {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    });
  }
}
