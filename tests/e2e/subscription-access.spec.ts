import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

for (const width of [390, 1440]) {
  test(`refresh never opens the AI chooser for a free user at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mockCaptcha(page);
    const id = '00000000-0000-4000-8000-000000000001';
    const user = { id, email: 'access@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
    let delaySubscription = false;
    let release: (() => void) | undefined;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      let body: unknown = [];
      if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user };
      else if (url.pathname.endsWith('/auth/v1/user')) body = user;
      else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
      else if (url.pathname.endsWith('/profiles')) {
        if (delaySubscription && url.searchParams.get('select')?.startsWith('is_pro,')) {
          await new Promise<void>(resolve => { release = resolve; });
        }
        body = { id, company_name: 'Access Check', country_code: 'IN', currency_code: 'INR', currency_symbol: 'Rs', locale: 'en-IN', is_pro: false, pro_since: null, pro_expiry: null, pro_plan: null, payment_status: 'inactive' };
      } else if (!url.pathname.includes('/rest/v1/')) return route.abort();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('/settings');
    await page.getByPlaceholder('your@email.com').first().fill(user.email);
    await page.locator('#login-password').fill('test-password-only');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Build with AI - Pro required' })).toBeVisible();
    delaySubscription = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    const checking = page.getByRole('button', { name: 'Checking Pro access' });
    await expect(checking).toBeVisible(); await expect(checking).toBeDisabled();
    await checking.dispatchEvent('click');
    await expect(page.getByText('Floor Plan Analysis', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Upgrade to Intorza Pro' })).toHaveCount(0);
    await expect.poll(() => !!release).toBe(true);
    delaySubscription = false; release!();
    await page.getByRole('button', { name: 'Build with AI - Pro required' }).click();
    await expect(page.getByRole('dialog', { name: 'Upgrade to Intorza Pro' })).toBeVisible();
    await expect(page.getByText('Floor Plan Analysis', { exact: true })).toHaveCount(0);
  });
}
