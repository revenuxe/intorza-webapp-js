import type { Page } from '@playwright/test';

// Fake tokens exist only in intercepted browser tests, never in app code.
export async function mockCaptcha(page: Page) {
  await page.addInitScript(() => {
    const callbacks = new Map<string, (token: string) => void>();
    let next = 0;
    window.turnstile = {
      render: (_element, options) => {
        const id = `test-widget-${next++}`;
        const callback = options.callback as (token: string) => void;
        callbacks.set(id, callback);
        queueMicrotask(() => callback('intercepted-test-captcha-token'));
        return id;
      },
      reset: id => { queueMicrotask(() => callbacks.get(id)?.('intercepted-test-captcha-token')); },
      remove: id => { callbacks.delete(id); },
    };
  });
}
