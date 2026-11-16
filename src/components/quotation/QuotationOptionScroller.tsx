'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuotationOptionScroller({ label, activeKey, children }: { label: string; activeKey: string | number; children: ReactNode }) {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const selected = track.current?.querySelector<HTMLElement>('[aria-current="page"], [aria-current="true"]');
    if (selected && track.current) {
      // Scroll only this track, without moving the page or dialog vertically.
      const left = selected.getBoundingClientRect().left - track.current.getBoundingClientRect().left + track.current.scrollLeft;
      if (left < track.current.scrollLeft || left + selected.offsetWidth > track.current.scrollLeft + track.current.clientWidth) {
        track.current.scrollTo?.({ left: Math.max(0, left - 8), behavior: 'smooth' });
      }
    }
  }, [activeKey]);
  const scroll = (direction: number) => track.current?.scrollBy?.({ left: direction * Math.max(160, track.current.clientWidth * 0.8), behavior: 'smooth' });
  return <div className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Swipe or use arrows</p><div className="flex gap-1"><Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label={`Scroll ${label.toLowerCase()} left`} onClick={() => scroll(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label={`Scroll ${label.toLowerCase()} right`} onClick={() => scroll(1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    <nav ref={track} aria-label={label} className="relative flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] [&>*]:shrink-0 [&>*]:snap-start">{children}</nav>
  </div>;
}
