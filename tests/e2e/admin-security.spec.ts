import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

test('anonymous visitors cannot open the admin dashboard', async ({ page }) => {
  await mockCaptcha(page);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByText('Admin Portal', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Billing', exact: true })).toHaveCount(0);
});

test('ordinary authenticated users are denied admin login', async ({ page }) => {
  await mockCaptcha(page);
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'customer@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  let adminDirectoryRequests = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.endsWith('/rpc/admin_user_directory')) adminDirectoryRequests++;
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'customer-session', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
    await route.fulfill({ json: body });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('customer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByText('Access denied. Admin privileges required.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(adminDirectoryRequests).toBe(0);
});

test('admin query failures are visible and global refresh reloads the directory', async ({ page }) => {
  await mockCaptcha(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'admin@intorza.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  let directories = 0;
  let outage = true;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'admin-session', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = true;
    else if (url.pathname.endsWith('/rpc/admin_user_directory')) { directories++; body = { users: [], total: 0 }; }
    else if (outage && url.pathname.includes('/rest/v1/') && !url.pathname.includes('/rpc/')) return route.fulfill({ status: 503, json: { message: 'Synthetic outage' } });
    await route.fulfill({ json: body });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@intorza.com');
  await page.getByLabel('Password', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByText(/Some data is unavailable or may be outdated/)).toBeVisible();
  await expect.poll(() => directories).toBeGreaterThan(0);
  const before = directories;
  await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click();
  await expect.poll(() => directories).toBeGreaterThan(before);
  await expect(page.getByText('Some dashboard sections could not be refreshed.')).toBeVisible();
  outage = false;
  await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click();
  await expect(page.getByText('Dashboard data refreshed')).toBeVisible();
  await expect(page.getByText(/Some data is unavailable or may be outdated/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
