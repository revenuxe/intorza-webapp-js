import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

test('product-first item cards keep optional specifications, pricing and responsive order', async ({ page }) => {
  await mockCaptcha(page);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.includes('/rest/v1/')) return route.fulfill({ json: [] });
    return route.abort();
  });
  await page.goto('/');
  await page.locator('#projectTitle').fill('Product specifications check');
  const card = page.getByRole('article', { name: /^Item 1:/ });
  await card.getByLabel('Product Name', { exact: true }).fill('Wardrobe');
  await card.getByLabel('Product Details', { exact: true }).fill('4-door wardrobe with loft');
  await expect(card.getByLabel('Material', { exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: 'Add specifications', exact: true }).click();
  await card.getByLabel('Material', { exact: true }).fill('BWP Plywood');
  await card.getByLabel('Brand', { exact: true }).fill('Century');
  await card.getByRole('button', { name: 'Add field', exact: true }).click();
  await card.getByRole('button', { name: 'Add custom field', exact: true }).click();
  await card.getByLabel('Custom field name').fill('Warranty');
  await card.getByRole('button', { name: 'Add field', exact: true }).click();
  await card.getByLabel('Warranty', { exact: true }).fill('10 years');
  await card.getByLabel('Width (ft)', { exact: true }).fill('8');
  await card.getByLabel('Height (ft)', { exact: true }).fill('7');
  await card.getByLabel('Rate / Sq.ft', { exact: false }).fill('1850');
  await expect(card.getByLabel('Area (Sq.ft)', { exact: true })).toHaveValue('56');
  await expect(card).toContainText(/1,03,600|103,600/);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const selectors = [card.getByLabel('Product Name', { exact: true }), card.getByLabel('Product Details', { exact: true }), card.getByLabel('Material', { exact: true }), card.getByRole('combobox', { name: 'Measurement unit' }), card.getByLabel('Width (ft)', { exact: true }), card.getByLabel('Area (Sq.ft)', { exact: true }), card.getByLabel('Side', { exact: true }), card.getByLabel('Rate / Sq.ft', { exact: false })];
    const positions = await Promise.all(selectors.map(locator => locator.boundingBox()));
    for (let index = 1; index < positions.length; index++) expect(positions[index]!.y).toBeGreaterThanOrEqual(positions[index - 1]!.y);
    const side = await card.getByLabel('Side', { exact: true }).boundingBox();
    const rate = await card.getByLabel('Rate / Sq.ft', { exact: false }).boundingBox();
    expect(Math.abs(side!.y - rate!.y)).toBeLessThan(2);
    expect(rate!.width).toBeGreaterThan(side!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await card.screenshot({ path: 'test-results/product-specifications-mobile.png' });
  await expect(card.getByText('Calculated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Item to Room', exact: true }).click();
  await expect(card.getByRole('button', { name: '1. Wardrobe' })).toHaveAttribute('aria-expanded', 'false');
  await expect(card.getByLabel('Product Name', { exact: true })).toBeHidden();
  await expect(page.getByRole('article', { name: /^Item 2:/ }).getByLabel('Product Name', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: '1. Wardrobe' }).click();
  await expect(card.getByLabel('Product Details', { exact: true })).toHaveValue('4-door wardrobe with loft');
  await expect(card.getByLabel('Warranty', { exact: true })).toHaveValue('10 years');
  await page.getByRole('button', { name: 'Save as Draft', exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  const pending = await page.evaluate(() => sessionStorage.getItem('pendingFormData'));
  expect(pending).toContain('4-door wardrobe with loft');
  expect(pending).toContain('Material: BWP Plywood');
  expect(pending).toContain('Brand: Century');
  expect(pending).toContain('Warranty: 10 years');
});
