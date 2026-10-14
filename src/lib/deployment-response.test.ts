/** @jest-environment node */
import { protectDeploymentResponse } from './deployment-response.mjs';

describe('deployment response caching', () => {
  it.each(['text/html; charset=utf-8', 'text/x-component'])('prevents old pages/routes outliving their chunks: %s', type => {
    const response = protectDeploymentResponse(new Request('https://example.test/'), new Response('content', { headers: { 'Content-Type': type, 'Cache-Control': 's-maxage=31536000' } }));
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store');
  });
  it('preserves immutable caching for successful versioned scripts', () => {
    const asset = new Response('code', { headers: { 'Content-Type': 'text/javascript', 'Cache-Control': 'public,max-age=31536000,immutable' } });
    expect(protectDeploymentResponse(new Request('https://example.test/_next/static/chunks/a.js'), asset)).toBe(asset);
  });
  it('prevents a transient missing chunk from becoming a cached failure', () => {
    const response = protectDeploymentResponse(new Request('https://example.test/_next/static/chunks/a.js'), new Response('missing', { status: 404 }));
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
