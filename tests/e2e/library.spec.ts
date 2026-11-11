import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('guest library includes all defaults and persists inline prices', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByText('800 defaults / 80 categories', { exact: true })).toBeVisible();
  const rate = page.getByRole('textbox', { name: 'Rate for Wall Breaking', exact: true });
  await rate.fill('1450.50'); await rate.press('Enter');
  await page.reload();
  await expect(rate).toHaveValue('1450.5');
  await page.getByRole('textbox', { name: 'Search Products', exact: true }).fill('marble');
  await expect(page.getByText('Italian Marble', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('duplicate editor closes without leaving a menu pointer lock', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'More actions for Wall Breaking', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await page.getByLabel('Product name *', { exact: true }).fill('Independent test product');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Bulk Edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel selection', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search Products', exact: true }).fill('Independent test product');
  await expect(page.getByText('Independent test product', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('textbox', { name: 'Search Products', exact: true }).fill('Independent test product');
  await expect(page.getByText('Independent test product', { exact: true })).toBeVisible();
});
