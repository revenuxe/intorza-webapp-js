import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';
test('adding items and rooms collapses existing unfinished products without clearing entries', async ({ page }) => {
  await mockCaptcha(page);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.includes('/rest/v1/')) return route.fulfill({ json: [] });
    return route.abort();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const first = page.getByRole('article', { name: 'Item 1: Wardrobe', exact: true });
  await page.getByLabel('Product Name', { exact: true }).fill('Wardrobe');
  await first.getByLabel('Product Details', { exact: true }).fill('Keep these unfinished details');
  await page.getByRole('button', { name: 'Add Item to Room', exact: true }).click();
  await expect(first.getByLabel('Product Name', { exact: true })).toBeHidden();
  const second = page.getByRole('article', { name: /^Item 2:/ });
  await expect(second.getByLabel('Product Name', { exact: true })).toBeFocused();
  await expect.poll(async () => {
    const card = await second.boundingBox();
    const header = await page.locator('header').boundingBox();
    return card!.y - (header!.y + header!.height);
  }).toBeGreaterThanOrEqual(0);
  const secondTop = await second.boundingBox();
  expect(secondTop!.y).toBeLessThan(200);
  await second.getByLabel('Product Name', { exact: true }).fill('Ceiling');
  await first.getByRole('button', { name: '1. Wardrobe', exact: true }).click();
  await expect(first.getByLabel('Product Details', { exact: true })).toHaveValue('Keep these unfinished details');
  await page.getByRole('button', { name: 'Add Room', exact: true }).click();
  await expect(first.getByLabel('Product Name', { exact: true })).toBeHidden();
  await expect(second.getByLabel('Product Name', { exact: true })).toBeHidden();
  const newRoomItem = page.getByRole('article', { name: 'Item 1: New item', exact: true });
  await expect(newRoomItem.getByLabel('Product Name', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Room title 2', { exact: true })).toBeFocused();
  await expect.poll(async () => {
    const title = await page.getByLabel('Room title 2', { exact: true }).boundingBox();
    const header = await page.locator('header').boundingBox();
    return title!.y - (header!.y + header!.height);
  }).toBeGreaterThanOrEqual(0);
  await first.getByRole('button', { name: '1. Wardrobe', exact: true }).click();
  await expect(first.getByLabel('Product Details', { exact: true })).toHaveValue('Keep these unfinished details');
});
