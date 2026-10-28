'use client';

import { useEffect, useRef, useState } from 'react';
import { quotationDeliveryConfirmationSchema, type QuotationDelivery } from '@/lib/quotation-ai/delivery';

/** Charge only after the priced result has committed and had a chance to paint.
 * The database receipt, not a browser flag, makes retries/tabs idempotent. */
export function useQuotationDelivery({ receipt, visible, token, onConfirmed }: {
  receipt: QuotationDelivery | null; visible: boolean; token: () => Promise<string>;
  onConfirmed: (balance: number) => void;
}) {
  const [state, setState] = useState<'idle'|'pending'|'confirmed'|'error'>('idle');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ token, onConfirmed });
  callbacks.current = { token, onConfirmed };
  const projectId = receipt?.projectId;
  const paid = receipt?.paid;
  const ready = receipt?.ready;
  useEffect(() => {
    if (paid) { setState('confirmed'); setError(''); return; }
    if (!visible || !projectId || !ready) { setState('idle'); setError(''); return; }
    let cancelled = false;
    let secondFrame = 0;
    setState('pending'); setError('');
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(async () => {
        if (cancelled) return;
        try {
          const response = await fetch('/api/quotation-ai/floor-plan', {
            method: 'POST', headers: { Authorization: `Bearer ${await callbacks.current.token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'confirm_delivery', projectId }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || 'Coin confirmation could not be verified. Retry confirmation without generating again.');
          const confirmed = quotationDeliveryConfirmationSchema.parse(body);
          if (confirmed.projectId !== projectId) throw new Error('Coin confirmation did not match this quotation. Retry confirmation.');
          if (cancelled) return;
          setState('confirmed'); callbacks.current.onConfirmed(confirmed.balance);
        } catch (failure) {
          if (cancelled) return;
          setState('error');
          setError(failure instanceof Error ? failure.message : 'Coin confirmation could not be verified.');
        }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [visible, projectId, ready, paid, attempt]);
  return { state, error, retry: () => setAttempt(value => value + 1) };
}
