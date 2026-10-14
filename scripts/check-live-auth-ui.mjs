import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',()=>errors.push(true));
  const response=await page.goto('https://app.intorza.com/auth',{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByPlaceholder('your@email.com').first().waitFor({timeout:20000});
  await page.locator('[aria-label="Security verification"]').waitFor({timeout:20000});
  await page.waitForFunction(()=>Boolean(window.turnstile),{timeout:20000});
  console.log(JSON.stringify({pageStatus:response.status(),loginVisible:true,captchaContainerVisible:true,providerScriptLoaded:true,pageErrors:errors.length}));
  await page.screenshot({path:'.security-audit-readonly/live-auth.png',fullPage:true});
} finally { await browser.close(); }
