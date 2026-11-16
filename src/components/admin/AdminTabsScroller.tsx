'use client';
import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminTabsScroller({ children, label = 'Admin sections' }: { children: ReactNode; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => track.current?.scrollBy?.({ left: direction * Math.max(180, track.current.clientWidth * 0.75), behavior: 'smooth' });
  return <div className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Swipe to see more tabs</p><div className="flex gap-1"><Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label={`Scroll ${label.toLowerCase()} left`} onClick={() => scroll(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label={`Scroll ${label.toLowerCase()} right`} onClick={() => scroll(1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    <div ref={track} className="min-w-0 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]" onFocusCapture={event => {
      const tab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
      if (!tab || !track.current) return;
      const left = tab.getBoundingClientRect().left - track.current.getBoundingClientRect().left + track.current.scrollLeft;
      if (left < track.current.scrollLeft || left + tab.offsetWidth > track.current.scrollLeft + track.current.clientWidth) track.current.scrollTo?.({ left: Math.max(0,left - 8), behavior: 'smooth' });
    }}>{children}</div>
  </div>;
}
