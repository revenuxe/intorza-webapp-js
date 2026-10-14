import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';

test('anonymous team signup reads the limited directory without querying profiles', async ({ page }) => {
  await mockCaptcha(page);
  let privateReads = 0;
  let directoryReads = 0;
  await page.route('**/rest/v1/profiles*', async route => {
    privateReads++;
    await route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"permission denied"}' });
  });
  await page.route('**/rest/v1/companies_public*', async route => {
    directoryReads++;
    const select = new URL(route.request().url()).searchParams.get('select');
    expect(select).toBe('id,company_name,country_name,org_code');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: 'b10d372e-09ae-4f18-9b5d-711416e50101', company_name: 'Directory Test Company', country_name: 'India', org_code: 'DIR-TEST' },
    ]) });
  });
  await page.goto('/team/signup');
  await expect(page.getByText('Directory Test Company', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search company or location...').fill('India');
  await page.getByRole('button', { name: /Directory Test Company/ }).click();
  await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
  expect(directoryReads).toBeGreaterThan(0);
  expect(privateReads).toBe(0);
});
