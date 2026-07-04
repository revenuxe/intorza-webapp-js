import { useEffect, useRef, useState, memo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFCanvasPreviewHandle {
  scrollToPage: (pageIndex: number) => void;
}

interface PDFCanvasPreviewProps {
  pdfBlobUrl: string | null;
  zoom: number;
  isGenerating?: boolean;
  fitWidth?: boolean;
  onPagesChange?: (count: number) => void;
  onActivePageChange?: (pageIndex: number) => void;
}

// Find the nearest scrollable ancestor of an element
const getScrollParent = (el: HTMLElement | null): HTMLElement | Window => {
  let node = el?.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
};

export const PDFCanvasPreview = memo(
  forwardRef<PDFCanvasPreviewHandle, PDFCanvasPreviewProps>(
    ({ pdfBlobUrl, zoom, isGenerating, fitWidth, onPagesChange, onActivePageChange }, ref) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const pageRefs = useRef<(HTMLImageElement | null)[]>([]);
      const [pageDataUrls, setPageDataUrls] = useState<string[]>([]);
      const [loading, setLoading] = useState(false);
      const renderTaskRef = useRef<number>(0);
      // Preserve scroll position across regenerations
      const preservedScrollRef = useRef<{ parent: HTMLElement | Window; top: number } | null>(null);

      useImperativeHandle(ref, () => ({
        scrollToPage: (i: number) => {
          const el = pageRefs.current[i];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      }));

      // Capture scroll position BEFORE swapping images
      useEffect(() => {
        if (!pdfBlobUrl) {
          setPageDataUrls([]);
          onPagesChange?.(0);
          return;
        }

        // Snapshot scroll of the ancestor scroll container so we can restore it
        if (containerRef.current && pageDataUrls.length > 0) {
          const parent = getScrollParent(containerRef.current);
          const top = parent instanceof Window ? window.scrollY : parent.scrollTop;
          preservedScrollRef.current = { parent, top };
        }

        const taskId = ++renderTaskRef.current;
        if (pageDataUrls.length === 0) setLoading(true);

        const renderPdf = async () => {
          try {
            const response = await fetch(pdfBlobUrl);
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            if (taskId !== renderTaskRef.current) return;

            const dataUrls: string[] = [];
            // Cap DPR to keep canvas cost reasonable on high-DPI screens
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const scale = 1.25 * dpr;

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              if (taskId !== renderTaskRef.current) return;
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d', { alpha: false })!;
              await page.render({ canvasContext: ctx, viewport }).promise;
              dataUrls.push(canvas.toDataURL('image/jpeg', 0.88));
              // Yield to the browser between pages to keep UI responsive
              await new Promise<void>((r) => requestAnimationFrame(() => r()));
            }

            if (taskId === renderTaskRef.current) {
              setPageDataUrls(dataUrls);
              onPagesChange?.(dataUrls.length);
            }
          } catch (err) {
            console.error('PDF render error:', err);
          } finally {
            if (taskId === renderTaskRef.current) setLoading(false);
          }
        };

        renderPdf();
      }, [pdfBlobUrl]);

      // Restore scroll position AFTER new images have been committed to the DOM
      useLayoutEffect(() => {
        const snap = preservedScrollRef.current;
        if (!snap) return;
        preservedScrollRef.current = null;
        // Two rAFs: wait for layout + paint of new images
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (snap.parent instanceof Window) {
              window.scrollTo({ top: snap.top, behavior: 'auto' });
            } else {
              snap.parent.scrollTop = snap.top;
            }
          });
        });
      }, [pageDataUrls]);

      // Track which page is most visible
      useEffect(() => {
        if (pageDataUrls.length === 0 || !onActivePageChange) return;
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter(e => e.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) {
              const idx = Number((visible.target as HTMLElement).dataset.pageIdx);
              if (!Number.isNaN(idx)) onActivePageChange(idx);
            }
          },
          { threshold: [0.25, 0.5, 0.75], root: containerRef.current?.parentElement }
        );
        pageRefs.current.forEach(el => el && observer.observe(el));
        return () => observer.disconnect();
      }, [pageDataUrls.length, onActivePageChange]);

      if (loading && pageDataUrls.length === 0) {
        return (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Rendering preview...</p>
            </div>
          </div>
        );
      }

      if (pageDataUrls.length === 0) {
        return (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-muted-foreground">No preview available</p>
          </div>
        );
      }

      return (
        <div ref={containerRef} className="flex flex-col items-center gap-4">
          {isGenerating && (
            <div className="sticky top-2 z-10 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-md border">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] text-muted-foreground">Updating…</span>
            </div>
          )}
          {pageDataUrls.map((src, i) => (
            <img
              // Stable key: prevents remount on regeneration → preserves scroll & avoids flicker
              key={i}
              ref={el => (pageRefs.current[i] = el)}
              data-page-idx={i}
              src={src}
              alt={`PDF page ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="rounded-lg shadow-lg border bg-white scroll-mt-4 select-none"
              style={
                fitWidth
                  ? { width: '100%', maxWidth: '900px', contain: 'content' }
                  : { width: `min(100%, ${595 * (zoom / 100)}px)`, contain: 'content' }
              }
            />
          ))}
        </div>
      );
    }
  )
);

PDFCanvasPreview.displayName = 'PDFCanvasPreview';
