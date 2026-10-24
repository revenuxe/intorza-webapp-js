import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: '**/date-inputs.spec.ts',
  projects: [
    { name: 'iphone-14-pro-webkit', use: { ...devices['iPhone 14 Pro'], browserName: 'webkit' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
});
