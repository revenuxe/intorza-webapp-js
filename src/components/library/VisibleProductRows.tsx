'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Keep category headings available, but mount editable rows only near the
// viewport. Broad searches must not mount hundreds of input editors at once.
export function VisibleProductRows({ children, count }: { children: ReactNode; count: number }) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && target.contains(document.activeElement)) return;
      if (!entry.isIntersecting && target.getBoundingClientRect().height) setHeight(target.getBoundingClientRect().height);
      setVisible(entry.isIntersecting);
    }, { rootMargin: '400px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return <div ref={element} style={!visible ? { minHeight: height || Math.min(count, 30) * 100 } : undefined}>
    {visible ? children : <p className="p-4 text-xs text-muted-foreground">{count} products · scroll to edit</p>}
  </div>;
}
