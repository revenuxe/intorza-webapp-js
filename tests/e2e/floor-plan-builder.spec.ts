import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';
import { buildEstimate } from '../../src/lib/quotation-ai/floor-plan';
import { proposalFixture } from '../../src/test/floor-plan-fixtures';

test('floor plan builder stays within mobile/tablet/desktop widths and preserves the quotation', async ({ page }) => {
  await mockCaptcha(page);
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'check@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  let paidRequests = 0;
  const room = { name: 'Bedroom', kind: 'bedroom', floor: '1', widthFt: null, lengthFt: null, source: 'unknown', confidence: 'low', file: 'plan.pdf', page: 1, notes: 'Measurements require review. '.repeat(12) };
  await page.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname === '/api/quotation-ai/floor-plan') {
      paidRequests++;
      if (req.headers()['content-type']?.includes('application/json')) {
        const input = req.postDataJSON();
        return route.fulfill({ json: { projectId: id, estimate: buildEstimate(proposalFixture(), input.analysis, input.brief, [], input.draft) } });
      }
      return route.fulfill({ json: { projectId: id, analysis: { propertyType: 'Apartment', floors: 1, units: 'Unknown', scale: 'Unknown', warnings: ['Uncertain dimensions. '.repeat(25)], rooms: [room] } } });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
    else if (url.pathname.endsWith('/profiles')) body = { id, company_name: 'Integration Check', country_code: 'IN', currency_code: 'INR', currency_symbol: 'Rs', locale: 'en-IN' };
    else if (url.pathname.endsWith('/subscription-status')) body = { isPro: true, status: 'active', plan: 'pro' };
    else if (!url.pathname.includes('/rest/v1/')) return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/settings');
  await page.getByPlaceholder('your@email.com').first().fill('check@example.test');
  await page.locator('#login-password').fill('test-password-only');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goto('/');
  await page.locator('#projectTitle').fill('Preserve my manual title');
  const actions = page.getByLabel('Quotation actions');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const boxes = await Promise.all(['Templates', 'Customize', 'Built with AI'].map(name => actions.getByRole('button', { name, exact: true }).boundingBox()));
    const aiButton = actions.getByRole('button', { name: 'Built with AI', exact: true });
    const titleBox = await aiButton.getByText('Built with AI', { exact: true }).boundingBox();
    const coinsBox = await aiButton.getByText('60 coins', { exact: true }).boundingBox();
    expect(Math.abs((titleBox!.y + titleBox!.height / 2) - (coinsBox!.y + coinsBox!.height / 2))).toBeLessThan(2);
    if (width < 640) {
      expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
      expect(boxes[2]!.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height);
      expect(boxes[2]!.width).toBeGreaterThan(boxes[0]!.width * 1.9);
    } else {
      expect(Math.max(...boxes.map(box => box!.y)) - Math.min(...boxes.map(box => box!.y))).toBeLessThan(2);
      expect(boxes[2]!.width).toBeGreaterThanOrEqual(220);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Built with AI' }).click();
  const chooser = page.getByRole('dialog');
  await expect(chooser.getByText('60 coins')).toBeVisible();
  await expect(chooser.getByText('15 credits')).toBeVisible();
  await expect(chooser.getByText('10 credits')).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const upload = await chooser.getByRole('button', { name: 'Upload Floor Plan' }).boundingBox();
    const generate = await chooser.getByRole('button', { name: 'Generate Quotation' }).boundingBox();
    expect(Math.abs(upload!.y - generate!.y)).toBeLessThan(2);
    expect(generate!.x).toBeGreaterThan(upload!.x + upload!.width);
    expect(await chooser.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/ai-chooser-mobile.png' });
  await page.getByRole('button', { name: 'Upload Floor Plan' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Upload your floor plan' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-upload-mobile.png' });
  await dialog.getByLabel('Floor plan files').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
  await dialog.getByRole('button', { name: 'Analyse Floor Plan' }).click();
  await expect(dialog.getByRole('heading', { name: 'Your property analysis' })).toBeVisible();
  expect(paidRequests).toBe(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await dialog.evaluate(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, width: element.clientWidth, scroll: element.scrollWidth, viewport: window.innerWidth, page: document.documentElement.scrollWidth }));
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(width);
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    expect(bounds.page).toBeLessThanOrEqual(bounds.viewport);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/floor-plan-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByRole('heading', { name: 'What would you like to design?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByRole('heading', { name: 'Who is this project for?' })).toBeVisible();
  expect(paidRequests).toBe(1);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#projectTitle')).toHaveValue('Preserve my manual title');
  expect(await page.getByRole('button', { name: /Listen|Read question|Speak/ }).count()).toBe(0);
  // Exercise the alternative path and apply an estimate through the real editor adapter.
  await page.getByRole('button', { name: 'Built with AI' }).click();
  await page.getByRole('button', { name: 'Generate Quotation', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Your property analysis' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Add room' }).click();
  await dialog.getByRole('textbox', { name: 'Room 1 name' }).fill('Bedroom');
  for (let i = 0; i < 4; i++) await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByPlaceholder('Enter or select client name').fill('Rahul');
  // Close the existing client selector suggestions before continuing.
  await dialog.getByLabel('Project city or location').click();
  await dialog.getByLabel('Project city or location').fill('Bengaluru');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Generate Quotation', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Your quotation is ready to review' })).toBeVisible();
  await expect(dialog.getByText(/Partial total/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit Quotation', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#projectTitle')).toHaveValue('Preserve my manual title');
  await expect(page.getByPlaceholder('Enter or select client name')).toHaveValue('Rahul');
  await expect(page.getByText(/AI-generated estimate — rates and measurements require review/)).toBeVisible();
  await expect(page.getByText('Provisional Total', { exact: true })).toBeVisible();
  expect(paidRequests).toBe(2);
});
