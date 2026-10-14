"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }
export interface AuthCaptchaHandle { getToken: () => string | undefined; reset: () => void }

let loading: Promise<void> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error('Security check could not load.')); };
    document.head.appendChild(script);
  });
  return loading;
}

export function requireAuthCaptcha(ref: RefObject<AuthCaptchaHandle | null>) {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return undefined;
  const token = ref.current?.getToken();
  if (!token) throw new Error('Please complete the security check before continuing.');
  return token;
}

export const AuthCaptcha = forwardRef<AuthCaptchaHandle>(function AuthCaptcha(_props, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const element = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const token = useRef<string | undefined>(undefined);
  const [error, setError] = useState('');
  useImperativeHandle(ref, () => ({
    getToken: () => token.current,
    reset: () => {
      token.current = undefined;
      if (widget.current !== undefined) window.turnstile?.reset(widget.current);
    },
  }), []);
  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    void loadTurnstile().then(() => {
      if (!active || !element.current || !window.turnstile) return;
      widget.current = window.turnstile.render(element.current, {
        sitekey: siteKey,
        size: 'normal',
        theme: 'light',
        appearance: 'interaction-only',
        callback: (value: string) => { if (active) { token.current = value; setError(''); } },
        'expired-callback': () => { token.current = undefined; },
        'error-callback': () => { token.current = undefined; if (active) setError('Security check failed. Please retry.'); },
      });
    }).catch(() => { if (active) setError('Security check could not load. Refresh and try again.'); });
    return () => {
      active = false;
      token.current = undefined;
      if (widget.current !== undefined) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey]);
  if (!siteKey) return null;
  return <div className="flex flex-col items-center gap-2"><div ref={element} aria-label="Security verification" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>;
});
