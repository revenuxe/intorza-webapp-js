import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

test.beforeEach(async ({ page }) => {
  await mockCaptcha(page);
  // Browser checks never call the live database, auth provider, or payment API.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.includes('/rest/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.abort();
  });
});

test('quotation editor hydrates, previews a PDF, and retains a draft before login', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create Quotation', exact: true })).toBeVisible();
  await page.locator('#projectTitle').fill('Migration smoke test');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-testid="pdf-page-0"]')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save as Draft', exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(await page.evaluate(() => sessionStorage.getItem('returnPath'))).toBe('/');
  expect(await page.evaluate(() => sessionStorage.getItem('pendingFormData'))).toContain('Migration smoke test');
  expect(errors).toEqual([]);
});

test('protected deep links keep their return path and redirect to sign in', async ({ page }) => {
  await page.goto('/site-measurement/test-project/pricing?source=link');
  await expect(page).toHaveURL(/\/auth$/);
  expect(await page.evaluate(() => sessionStorage.getItem('returnPath'))).toBe('/site-measurement/test-project/pricing?source=link');
  await expect(page.getByPlaceholder('your@email.com').first()).toBeVisible();
});

test('mobile editor fits the screen and opens navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create Quotation', exact: true })).toBeVisible();
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  await page.locator('header button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
});

test('legal pages render on the server and unknown pages return 404', async ({ request }) => {
  const privacy = await request.get('/privacy-policy');
  expect(privacy.status()).toBe(200);
  expect(await privacy.text()).toContain('Privacy Policy');
  expect(privacy.headers()['x-content-type-options']).toBe('nosniff');
  const missing = await request.get('/missing-migration-route');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Page not found');
  const alias = await request.get('/quotation/abc', { maxRedirects: 0 });
  expect(alias.status()).toBe(307);
  expect(alias.headers().location).toBe('/quotations/abc');
  const editorAlias = await request.get('/create-quotation?id=abc', { maxRedirects: 0 });
  expect(editorAlias.status()).toBe(307);
  expect(editorAlias.headers().location).toBe('/?id=abc');
});

test('admin tools require sign in and invalid quotation links fail cleanly', async ({ page }) => {
  await page.goto('/admin/pdf-qa');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/quotation-response');
  await expect(page.getByText('Invalid link. Please contact the sender.')).toBeVisible();
});

test('sign in returns to the requested dashboard using the existing Supabase integration', async ({ page }) => {
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'migration@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { full_name: 'Migration Test' }, created_at: new Date().toISOString() };
  const profile = { id, company_name: 'Migration Test', phone: '1234567890', country_code: 'IN', currency_symbol: '₹', locale: 'en-IN' };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
    else if (url.pathname.endsWith('/profiles')) body = profile;
    else if (url.pathname.endsWith('/subscription-status')) body = { isPro: false, status: 'inactive', plan: null, expiry: null, proSince: null };
    else if (!url.pathname.includes('/rest/v1/')) return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByPlaceholder('your@email.com').first().fill('migration@example.test');
  await page.locator('#login-password').fill('test-password-only');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
});

test('the PWA caches only the public fallback and serves it offline', async ({ page }) => {
  // Playwright routing disables the HTTP cache, but service workers stay enabled.
  await page.goto('/privacy-policy');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('intorza-offline-v1');
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  });
  expect(cached).toEqual(['/offline.html']);
  await page.context().setOffline(true);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
  await page.context().setOffline(false);
});
