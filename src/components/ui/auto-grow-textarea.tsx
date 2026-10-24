'use client';
import { useLayoutEffect, useRef } from 'react';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

/** Starts at input height and grows with text, including after a card reopens. */
export function AutoGrowTextarea({ value, ...props }: TextareaProps) {
  const element = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const input = element.current;
    if (!input || !input.getClientRects().length) return;
    input.style.height = 'auto';
    const borders = input.offsetHeight - input.clientHeight;
    input.style.height = `${Math.min(240, Math.max(40, input.scrollHeight + borders))}px`;
  };
  useLayoutEffect(resize, [value]);
  useLayoutEffect(() => {
    if (!element.current) return;
    let width = -1;
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth === undefined || nextWidth === width) return;
      width = nextWidth;
      resize();
    });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return <Textarea {...props} ref={element} value={value} rows={1} className="min-h-10 resize-none overflow-y-auto" />;
}
