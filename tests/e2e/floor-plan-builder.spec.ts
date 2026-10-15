import { test, expect } from '@playwright/test';
import { mockCaptcha } from './mock-captcha';
import { buildEstimate, completeEstimate, type Estimate } from '../../src/lib/quotation-ai/floor-plan';
import { ensureRoomWorkCoverage } from '../../src/lib/quotation-ai/room-work';
import { proposalFixture } from '../../src/test/floor-plan-fixtures';

test('floor plan builder stays within mobile/tablet/desktop widths and preserves the quotation', async ({ page }) => {
  await mockCaptcha(page);
  const id = '00000000-0000-4000-8000-000000000001';
  const user = { id, email: 'check@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  let paidRequests = 0;
  let currentEstimate: Estimate | null = null;
  let releaseUpload: (() => void) | undefined;
  let savedQuotation: Record<string, unknown> | null = null;
  let savedSections: { id: string; section_name: string; sort_order: number; items: { id: string; [key: string]: unknown }[] }[] = [];
  const room = { name: 'Bedroom', kind: 'bedroom', floor: '1', widthFt: null, lengthFt: null, source: 'unknown', confidence: 'low', file: 'plan.pdf', page: 1, notes: 'Measurements require review. '.repeat(12) };
  await page.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname === '/api/quotation-ai/floor-plan') {
      if (req.headers()['content-type']?.includes('application/json')) {
        const input = req.postDataJSON();
        if (input.action === 'complete') {
          currentEstimate = completeEstimate(currentEstimate!, input.changes);
          return route.fulfill({ json: { projectId: id, estimate: currentEstimate } });
        }
        paidRequests++;
        currentEstimate = buildEstimate(ensureRoomWorkCoverage(proposalFixture() as Parameters<typeof ensureRoomWorkCoverage>[0], input.analysis.rooms, input.brief), input.analysis, input.brief, [], input.draft);
        return route.fulfill({ json: { projectId: id, estimate: currentEstimate } });
      }
      paidRequests++;
      await new Promise<void>(resolve => { releaseUpload = resolve; });
      return route.fulfill({ json: { projectId: id, analysis: { propertyType: 'Apartment', floors: 1, units: 'Unknown', scale: 'Unknown', warnings: ['Uncertain dimensions. '.repeat(25)], rooms: [room, { ...room, name: 'Living Room', kind: 'living', notes: 'Entrance door and balcony opening: confirm the available TV wall.' }] } } });
    }
    if (url.hostname === '127.0.0.1') return route.continue();
    let body: unknown = [];
    if (url.pathname.endsWith('/auth/v1/token')) body = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user };
    else if (url.pathname.endsWith('/auth/v1/user')) body = user;
    else if (url.pathname.endsWith('/rpc/is_admin')) body = false;
    else if (url.pathname.endsWith('/profiles')) body = { id, company_name: 'Integration Check', country_code: 'IN', currency_code: 'INR', currency_symbol: 'Rs', locale: 'en-IN' };
    else if (url.pathname.endsWith('/subscription-status')) body = { isPro: true, status: 'active', plan: 'pro' };
    else if (url.pathname.endsWith('/rpc/save_quotation')) {
      const payload = req.postDataJSON().p_payload;
      savedQuotation = { ...payload, id, quotation_number: 'QT-BROWSER-CHECK' };
      savedSections = payload.sections;
      body = savedQuotation;
    }
    else if (url.pathname.endsWith('/quotations')) body = savedQuotation ?? [];
    else if (url.pathname.endsWith('/quotation_sections')) body = savedSections.map(section => ({ ...section, quotation_items: section.items }));
    else if (url.pathname.endsWith('/quotation_items')) body = savedSections.find(section => `eq.${section.id}` === url.searchParams.get('section_id'))?.items ?? [];
    else if (url.pathname.endsWith('/quotation_plan_projects')) {
      if (req.method() === 'PATCH') currentEstimate = req.postDataJSON().estimate;
      body = { id, estimate: currentEstimate };
    }
    else if (!url.pathname.includes('/rest/v1/')) return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/settings');
  await page.getByPlaceholder('your@email.com').first().fill('check@example.test');
  await page.locator('#login-password').fill('test-password-only');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goto('/');
  // Layout assertions should measure final geometry, not dialog/viewport animation frames.
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.locator('#projectTitle').fill('Preserve my manual title');
  const actions = page.getByLabel('Quotation actions');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
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
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
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
  const panel = dialog.locator('[aria-label="Quotation step content"]');
  const confirmRoom = async () => {
    for (const group of await dialog.getByRole('group', { name: /^Include/ }).all()) {
      const question = await group.locator('legend').textContent() || '';
      await group.getByRole('radio', { name: /wardrobe|room storage|false ceiling|wall painting/.test(question) ? 'Yes' : 'No', exact: true }).check();
    }
  };
  const confirmDesign = async () => {
    await dialog.getByRole('group', { name: /coordinated/ }).getByRole('radio', { name: 'Yes', exact: true }).check();
    await dialog.getByRole('group', { name: /retain existing/ }).getByRole('radio', { name: 'No', exact: true }).check();
    await dialog.getByRole('button', { name: 'Continue' }).click();
  };
  await expect(dialog.getByRole('heading', { name: 'Upload your floor plan' })).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-upload-mobile.png' });
  await dialog.getByLabel('Floor plan files').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
  await dialog.getByRole('button', { name: 'Analyse Floor Plan' }).click();
  await expect(dialog.getByRole('status')).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await panel.evaluate(element => { element.scrollTop = element.scrollHeight; });
    const status = await dialog.getByRole('status').boundingBox();
    const footer = await dialog.getByRole('button', { name: 'Cancel request' }).boundingBox();
    expect(status!.y).toBeGreaterThanOrEqual(0);
    expect(status!.y + status!.height).toBeLessThan(844);
    expect(footer!.y + footer!.height).toBeLessThan(844);
    await expect(dialog.getByRole('progressbar', { name: 'Upload progress' })).toBeVisible();
  }
  await expect.poll(() => Boolean(releaseUpload)).toBe(true);
  await page.screenshot({ path: 'test-results/floor-plan-loading-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/floor-plan-loading-mobile.png' });
  releaseUpload!();
  await expect(dialog.getByRole('heading', { name: 'What would you like to design?' })).toBeVisible();
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBe(0);
  await expect(dialog.getByText('rooms detected', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Generate Quotation', exact: true })).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/plan-analysis-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/plan-analysis-mobile.png' });
  await expect(dialog.getByRole('button', { name: 'Full interior', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('group', { name: /^Include/ })).toHaveCount(0);
  expect(paidRequests).toBe(1);
  await dialog.getByRole('radio', { name: 'Sqft Direct area', exact: true }).check();
  await dialog.getByRole('button', { name: 'Generate Quotation', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Your quotation is ready to review' })).toBeVisible();
  expect(paidRequests).toBe(2);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#projectTitle')).toHaveValue('Preserve my manual title');
  expect(await page.getByRole('button', { name: /Listen|Read question|Speak/ }).count()).toBe(0);
  // Exercise the alternative path and apply an estimate through the real editor adapter.
  await page.getByRole('button', { name: 'Built with AI' }).click();
  await page.getByRole('button', { name: 'Generate Quotation', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Your property analysis' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Add room' }).click();
  await dialog.getByRole('textbox', { name: 'Room 1 name' }).fill('Bedroom');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('radio', { name: 'No, select rooms' }).check();
  await dialog.getByRole('checkbox', { name: /Bedroom/ }).check();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await confirmRoom();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await confirmDesign();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByPlaceholder('Enter or select client name').fill('Rahul');
  // Close the existing client selector suggestions before continuing.
  await dialog.getByLabel('Project city or location').click();
  await dialog.getByLabel('Project city or location').fill('Bengaluru');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Generate Quotation', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Your quotation is ready to review' })).toBeVisible();
  await expect(dialog.getByText(/Partial total/)).toBeVisible();
  await dialog.getByLabel('Known selling rate per sqft (optional)').fill('1200');
  await dialog.getByRole('button', { name: 'Apply details', exact: true }).click();
  await expect(dialog.getByText(/Partial total/)).toBeVisible();
  await expect(dialog.getByText('1 sections · 3 items', { exact: true })).toBeVisible();
  expect(paidRequests).toBe(3);
  await dialog.getByRole('button', { name: 'Edit Quotation', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#projectTitle')).toHaveValue('Preserve my manual title');
  await expect(page.getByPlaceholder('Enter or select client name')).toHaveValue('Rahul');
  await expect(page.getByText(/AI-generated estimate — rates and measurements require review/)).toBeVisible();
  await expect(page.getByText('Provisional Total', { exact: true })).toBeVisible();
  for (const name of ['Room storage','False ceiling','Wall painting']) await expect(page.locator(`input[value="${name}"]:visible`)).toHaveCount(1);
  await page.getByRole('button', { name: 'Save as Draft', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`id=${id}`));
  expect(savedSections).toHaveLength(1);
  expect(savedSections[0].items).toHaveLength(3);
  await page.reload();
  for (const name of ['Room storage','False ceiling','Wall painting']) await expect(page.locator(`input[value="${name}"]:visible`)).toHaveCount(1);
  expect(paidRequests).toBe(3);
});
