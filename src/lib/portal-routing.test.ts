/** @jest-environment node */
import { portalHref, routePortalRequest } from './portal-routing.mjs';

it.each([
  ['https://team.intorza.com/', 'https://team.intorza.com/login'],
  ['https://team.intorza.com/team/login?from=old', 'https://team.intorza.com/login?from=old'],
  ['https://admin.intorza.com/admin/dashboard', 'https://admin.intorza.com/dashboard'],
  ['https://admin.intorza.com/', 'https://admin.intorza.com/login'],
  ['https://app.intorza.com/team/signup', 'https://team.intorza.com/signup'],
  ['https://app.intorza.com/admin/dashboard', 'https://admin.intorza.com/dashboard'],
  ['https://team.intorza.com/quotations?x=1', 'https://team.intorza.com/dashboard?x=1'],
  ['https://team.intorza.com/quotations/file.pdf', 'https://team.intorza.com/dashboard'],
  ['https://admin.intorza.com/quotations', 'https://admin.intorza.com/dashboard'],
])('routes %s to its portal', (url, expected) => {
  const response = routePortalRequest(new Request(url));
  expect(response?.status).toBe(307);
  expect(response?.headers.get('location')).toBe(expected);
  expect(response?.headers.get('cache-control')).toContain('no-store');
});

it.each([
  'https://team.intorza.com/login',
  'https://team.intorza.com/dashboard/measurements/123',
  'https://admin.intorza.com/dashboard',
  'https://admin.intorza.com/api/admin/ai/training',
  'https://app.intorza.com/team',
  'https://app.intorza.com/quotations',
  'https://team.intorza.com/_next/static/chunk.js',
  'https://team.intorza.com/offline.html',
  'https://team.intorza.com/manifest.json',
  'http://localhost:8080/team/login',
])('serves valid requests without a redirect loop: %s', url => {
  expect(routePortalRequest(new Request(url))).toBeNull();
});

it('does not serve quotation APIs from the team or admin portal', () => {
  for (const host of ['team', 'admin']) {
    expect(routePortalRequest(new Request('https://' + host + '.intorza.com/api/quotation-ai/floor-plan'))?.status).toBe(404);
  }
});

it('uses full cross-origin navigation in production and local paths in development', () => {
  expect(portalHref('/team/login', 'app.intorza.com')).toBe('https://team.intorza.com/login');
  expect(portalHref('/admin/login', 'app.intorza.com')).toBe('https://admin.intorza.com/login');
  expect(portalHref('/team/dashboard', 'team.intorza.com')).toBe('/dashboard');
  expect(portalHref('/team/login', 'localhost')).toBe('/team/login');
  expect(portalHref('/dashboard', 'team.intorza.com')).toBe('/dashboard');
  expect(portalHref('/admin/pdf-qa', 'admin.intorza.com')).toBe('/pdf-qa');
  expect(portalHref('/team/signup?code=ABC', 'app.intorza.com')).toBe('https://team.intorza.com/signup?code=ABC');
  expect(portalHref('/team', 'app.intorza.com')).toBe('/team');
});
