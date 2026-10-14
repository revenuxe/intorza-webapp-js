import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

test('logo can be uploaded twice and selected library terms reach preview and downloaded PDF', async ({ page }) => {
  await mockCaptcha(page);
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'check@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  let profile: Record<string, unknown> = { id, company_name: 'Integration Check', phone: '1234567890', country_code: 'IN', currency_symbol: 'Rs', locale: 'en-IN' };
  const terms = [
    { id: 'old', template_name: 'Old default', template_type: 'quotation', is_default: true, is_enabled: true, content: [{ id: '1', title: 'OLD TERMS', points: ['Old terms must disappear'] }] },
    { id: 'selected', template_name: 'Custom agreement', template_type: 'quotation', is_default: false, is_enabled: false, content: [{ id: '1', title: 'CUSTOM AGREEMENT', points: ['Custom milestone payment applies'] }] },
  ];
  let uploads = 0;
  await page.addInitScript(() => {
    const original = URL.createObjectURL;
    (window as any).__pdfBlobs = [];
    URL.createObjectURL = function (blob: Blob) {
      if (blob.type === 'application/pdf') (window as any).__pdfBlobs.push(blob);
      return original.call(URL, blob);
    };
  });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
    else if (url.pathname.endsWith('/rpc/select_terms_template')) {
      for (const t of terms) t.is_default = t.id === req.postDataJSON().p_id;
      const selected = terms.find(t => t.is_default)!;
      selected.is_enabled = true;
      body = selected;
    } else if (url.pathname.endsWith('/profiles')) {
      if (req.method() === 'PATCH') profile = { ...profile, ...req.postDataJSON() };
      body = profile;
    } else if (url.pathname.endsWith('/terms_templates')) body = terms;
    else if (url.pathname.includes('/storage/v1/object/company-logos/') && req.method() === 'POST') {
      uploads++;
      body = { Key: url.pathname.split('/object/')[1] };
    } else if (url.pathname.endsWith('/subscription-status')) body = { isPro: true, status: 'active', plan: 'pro' };
    else if (!url.pathname.includes('/rest/v1/')) return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/settings');
  await page.getByPlaceholder('your@email.com').first().fill('check@example.test');
  await page.locator('#login-password').fill('test-password-only');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const logo = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64') };
  await page.locator('#logo').setInputFiles(logo);
  await expect.poll(() => uploads).toBe(1);
  await expect(page.locator('#logo')).toHaveValue('');
  const firstLogo = profile.logo_url;
  await page.locator('#logo').setInputFiles(logo);
  await expect.poll(() => uploads).toBe(2);
  await expect.poll(() => profile.logo_url).not.toBe(firstLogo);
  await page.goto('/library');
  await page.getByRole('tab', { name: 'Terms', exact: true }).click();
  await page.getByRole('button', { name: 'Use Custom agreement as default' }).click();
  await expect.poll(() => terms[1].is_default && terms[1].is_enabled).toBe(true);
  await page.goto('/');
  await page.getByPlaceholder('Enter or select client name').fill('Test Client');
  await page.locator('#clientAddress').fill('Test Address');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('[data-testid="pdf-page-0"]')).toBeVisible({ timeout: 30_000 });
  const previewBytes = await page.evaluate(async () => Array.from(new Uint8Array(await (window as any).__pdfBlobs.at(-1).arrayBuffer())));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const extract = async (bytes: Uint8Array) => {
    const pdf = await getDocument({ data: bytes, useSystemFonts: true }).promise;
    let text = '';
    for (let n = 1; n <= pdf.numPages; n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map((item: any) => item.str || '').join(' ');
    await pdf.destroy();
    return text;
  };
  expect(await extract(Uint8Array.from(previewBytes))).toContain('Custom milestone payment applies');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: /Download/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const pdfText = await extract(new Uint8Array(Buffer.concat(chunks)));
  expect(pdfText).toContain('Custom milestone payment applies');
  expect(pdfText).not.toContain('Old terms must disappear');
  expect(pdfText).not.toContain('SITE READINESS');
});
