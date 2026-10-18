import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';
test('admin AI training reviews quotation PDFs before global publication on mobile', async ({ page }) => {
  await mockCaptcha(page); await page.setViewportSize({ width: 390, height: 844 });
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'admin@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const document = { id, filename: 'quotation.pdf', status: 'pending', created_at: new Date().toISOString(), extraction: { location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Bedroom', productName: 'Wardrobe', material: 'Laminate', specification: 'Printed specification', unit: 'sqft', rate: 1400, quantity: 56, tax: 'excluded', installationIncluded: true, page: 1, notes: '' }] } };
  let publications = 0;
  await page.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname === '/api/admin/ai/training') {
      if (url.searchParams.get('kind') === 'prices') return route.fulfill({ json: { prices: [], total: 0 } });
      if (req.method() === 'GET') return route.fulfill({ json: { documents: [] } });
      if (req.headers()['content-type']?.includes('multipart/form-data')) return route.fulfill({ json: { document } });
      expect(req.postDataJSON().confirmAnonymized).toBe(true); publications++;
      return route.fulfill({ json: { success: true } });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'admin-session', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/admin_user_directory')) body = { users: [], total: 0 };
    else if (url.pathname.endsWith('/rpc/is_admin')) body = true;
    else if (url.pathname.endsWith('/profiles') && req.headers()['accept']?.includes('object')) body = { id, full_name: 'Admin' };
    else if (!url.pathname.includes('/rest/v1/')) return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.getByRole('tab', { name: 'AI training', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Train AI' })).toBeVisible();
  await page.getByLabel('Upload quotation PDFs').setInputFiles({ name: 'quotation.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
  await page.getByRole('button', { name: /Analyse.*quotation/ }).click();
  await expect(page.getByRole('heading', { name: 'quotation.pdf', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I reviewed the entries/ }).check();
  await page.getByLabel('Unit rate', { exact: true }).fill('1500');
  await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I reviewed the entries/ }).check();
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  await expect(page.getByText(/Published. New quotation requests/)).toBeVisible();
  expect(publications).toBe(1);
  expect(await page.getByRole('tabpanel').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-ai-training-mobile.png', fullPage: true });
});
