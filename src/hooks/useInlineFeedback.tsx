"use client";

import { useState } from 'react';

type Feedback = { title?: React.ReactNode; description?: React.ReactNode; variant?: string };

/** Feedback stays with the page instead of interrupting it with a floating toast. */
export function useInlineFeedback() {
  const [message, setMessage] = useState<Feedback | null>(null);
  return {
    toast: (feedback: Feedback) => setMessage(feedback),
    clearFeedback: () => setMessage(null),
    feedback: message ? (
      <div role={message.variant === 'destructive' ? 'alert' : 'status'}
        className={`my-3 rounded-lg border px-4 py-3 text-sm ${message.variant === 'destructive' ? 'border-destructive/30 text-destructive' : 'border-border text-muted-foreground'}`}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-medium">{message.title}</p>{message.description && <p className="mt-1">{message.description}</p>}</div>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message" className="px-1">×</button>
        </div>
      </div>
    ) : null,
  };
}
