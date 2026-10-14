import { test, expect } from '@playwright/test';

test('missing bootstrap scripts reload once and offer recovery without looping', async ({ page }) => {
  let failures = 0;
  await page.route('**/_next/static/**/*.js*', async route => {
    failures++;
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Missing deployment chunk' });
  });
  await page.goto('/');
  await expect(page).toHaveURL(/__intorza_reload=/);
  await expect(page.getByRole('heading', { name: 'An update is ready' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload app' })).toBeVisible();
  expect(failures).toBeGreaterThan(0);
  const url = page.url();
  await page.waitForLoadState('load');
  expect(page.url()).toBe(url);
});
