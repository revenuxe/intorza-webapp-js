import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { AuthCaptcha, requireAuthCaptcha, type AuthCaptchaHandle } from './AuthCaptcha';

describe('Auth CAPTCHA lifecycle', () => {
  const previous = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previous;
    delete window.turnstile;
  });
  it('requires a fresh verified token and invalidates expired and consumed tokens', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key';
    let callbacks: Record<string, unknown> = {};
    const reset = jest.fn();
    const remove = jest.fn();
    window.turnstile = { render: jest.fn((_element, options) => { callbacks = options; return 'widget'; }), reset, remove };
    const ref = createRef<AuthCaptchaHandle>();
    const view = render(<AuthCaptcha ref={ref} />);
    await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalled());
    expect(() => requireAuthCaptcha(ref)).toThrow('complete the security check');
    act(() => (callbacks.callback as (token: string) => void)('fresh-token'));
    expect(requireAuthCaptcha(ref)).toBe('fresh-token');
    act(() => (callbacks['expired-callback'] as () => void)());
    expect(() => requireAuthCaptcha(ref)).toThrow();
    act(() => (callbacks.callback as (token: string) => void)('replacement-token'));
    act(() => ref.current?.reset());
    expect(reset).toHaveBeenCalledWith('widget');
    expect(() => requireAuthCaptcha(ref)).toThrow();
    view.unmount();
    expect(remove).toHaveBeenCalledWith('widget');
  });
  it('does not invent a CAPTCHA token before the provider is configured', () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const ref = createRef<AuthCaptchaHandle>();
    const view = render(<AuthCaptcha ref={ref} />);
    expect(view.container).toBeEmptyDOMElement();
    expect(requireAuthCaptcha(ref)).toBeUndefined();
  });
});
