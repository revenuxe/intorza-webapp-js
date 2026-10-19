"use client";

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

type Feedback = { title?: React.ReactNode; description?: React.ReactNode; variant?: string };

/** Feedback stays with the page instead of interrupting it with a floating toast. */
export function useInlineFeedback({ autoRevealErrors = false }: { autoRevealErrors?: boolean } = {}) {
  const [message, setMessage] = useState<Feedback | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = messageRef.current;
    if (!autoRevealErrors || message?.variant !== 'destructive' || !element) return;
    const bounds = element.getBoundingClientRect();
    // Leave room for the sticky navigation when revealing a message above the form.
    if (bounds.top >= 112 && bounds.bottom <= window.innerHeight) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }, [message, autoRevealErrors]);

  const isError = message?.variant === 'destructive';
  const Icon = isError ? AlertCircle : Info;
  return {
    toast: (feedback: Feedback) => setMessage(feedback),
    clearFeedback: () => setMessage(null),
    feedback: message ? (
      <div
        ref={messageRef}
        tabIndex={-1}
        role={isError ? 'alert' : 'status'}
        className={`my-3 flex scroll-mt-28 items-start gap-3 rounded-xl border p-3 text-left text-sm shadow-sm outline-none sm:p-4 ${isError ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-muted/40'}`}
      >
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 py-1">
          {message.title && <p className="font-semibold leading-5 text-foreground">{message.title}</p>}
          {message.description && <p className="mt-1 break-words leading-relaxed text-muted-foreground">{message.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss message"
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    ) : null,
  };
}
