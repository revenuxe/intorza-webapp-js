import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';
test('quotation date fields stay aligned and editable when populated or empty on mobile', async ({ page }, testInfo) => {
  await mockCaptcha(page);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.includes('/rest/v1/')) return route.fulfill({ json: [] });
    return route.abort();
  });
  await page.goto('/');
  const reference = page.getByLabel('Client Address', { exact: true });
  await expect(reference).toBeVisible();
  for (const label of ['Date of Proposal', 'Quotation Valid Till', 'Project Deadline']) {
    const input = page.getByLabel(label, { exact: true });
    for (const value of ['2026-10-24', '']) {
      await input.fill(value);
      await expect(input).toHaveValue(value);
      const field = await input.boundingBox();
      const other = await reference.boundingBox();
      expect(Math.abs(field!.x - other!.x)).toBeLessThan(1);
      expect(Math.abs(field!.width - other!.width)).toBeLessThan(1);
      expect(Math.abs(field!.height - other!.height)).toBeLessThan(1);
      expect(await input.evaluate(element => getComputedStyle(element).boxSizing)).toBe('border-box');
      expect(await input.getAttribute('type')).toBe('date');
    }
  }
  await page.getByLabel('Date of Proposal', { exact: true }).fill('2026-10-24');
  await page.getByLabel('Quotation Valid Till', { exact: true }).fill('2026-10-31');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Date of Proposal', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-date-fields.png') });
});
