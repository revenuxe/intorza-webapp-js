export function protectDeploymentResponse(request, response) {
  const type = response.headers.get('content-type') || '';
  const pathname = new URL(request.url).pathname;
  const missingAsset = pathname.startsWith('/_next/static/') && response.status >= 400;
  if (!missingAsset && !type.includes('text/html') && !type.includes('text/x-component')) return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
