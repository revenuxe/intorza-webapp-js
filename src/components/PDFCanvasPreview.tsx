import { useCallback, useEffect, useMemo, useRef, useState, memo, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFCanvasPreviewHandle {
  scrollToPage: (pageIndex: number) => void;
}

export interface PDFPreviewMetrics {
  lastRenderMs: number;
  avgRenderMs: number;
  mountedPages: number;
  totalPages: number;
  frameDrops: number;
  fps: number;
}

interface PDFCanvasPreviewProps {
  pdfBlobUrl: string | null;
  zoom: number;
  isGenerating?: boolean;
  fitWidth?: boolean;
  onPagesChange?: (count: number) => void;
  onActivePageChange?: (pageIndex: number) => void;
  onMetrics?: (metrics: PDFPreviewMetrics) => void;
}

interface RenderedPage {
  width: number;
  height: number;
  src?: string;
  version?: number;
}

interface ScrollAnchor {
  index: number;
  offset: number;
}

const PAGE_WIDTH_PT = 595;
// Overscan of 2 = pre-render next & previous 2 pages, so scrolling on
// slower mobile devices feels instant with no blank flashes.
const PAGE_OVERSCAN = 2;

// Find the nearest scrollable ancestor of an element. The editor uses an element
// scroll container, but this fallback keeps the preview safe in standalone use.
const getScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  let node = el?.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const revokeSoon = (url?: string) => {
  if (!url?.startsWith('blob:')) return;
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};

export const PDFCanvasPreview = memo(
  forwardRef<PDFCanvasPreviewHandle, PDFCanvasPreviewProps>(
    ({ pdfBlobUrl, zoom, isGenerating, fitWidth, onPagesChange, onActivePageChange, onMetrics }, ref) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
      const scrollRootRef = useRef<HTMLElement | null>(null);
      const pdfDocRef = useRef<any>(null);
      const renderQueueRef = useRef<number[]>([]);
      const renderingPagesRef = useRef<Set<number>>(new Set());
      const queueRunningRef = useRef(false);
      const activePageRef = useRef(0);
      const pagesRef = useRef<RenderedPage[]>([]);
      const pendingAnchorRef = useRef<ScrollAnchor | null>(null);
      const [pages, setPages] = useState<RenderedPage[]>([]);
      const [virtualRange, setVirtualRange] = useState({ start: 0, end: 1 });
      const [loading, setLoading] = useState(false);
      const renderTaskRef = useRef<number>(0);
      // Perf metrics
      const renderTimesRef = useRef<number[]>([]);
      const frameDropsRef = useRef(0);
      const fpsRef = useRef(60);
      const metricsRafRef = useRef<number>(0);
      const onMetricsRef = useRef(onMetrics);
      useEffect(() => { onMetricsRef.current = onMetrics; }, [onMetrics]);

      useEffect(() => {
        pagesRef.current = pages;
      }, [pages]);

      const pageWidthStyle = useMemo(
        () => fitWidth
          ? { width: '100%', maxWidth: '900px' }
          : { width: `min(100%, ${PAGE_WIDTH_PT * (zoom / 100)}px)` },
        [fitWidth, zoom]
      );

      const getRoot = useCallback(() => {
        const root = scrollRootRef.current || getScrollParent(containerRef.current);
        scrollRootRef.current = root;
        return root;
      }, []);

      const getPageTop = useCallback((index: number, root: HTMLElement) => {
        const pageEl = pageRefs.current[index];
        if (!pageEl) return 0;
        const rootRect = root.getBoundingClientRect();
        const pageRect = pageEl.getBoundingClientRect();
        return root.scrollTop + pageRect.top - rootRect.top;
      }, []);

      const captureAnchor = useCallback((): ScrollAnchor | null => {
        const root = getRoot();
        if (!root || pagesRef.current.length === 0) return null;

        const rootRect = root.getBoundingClientRect();
        const rootTop = rootRect.top + 8;
        const rootMid = rootRect.top + rootRect.height * 0.35;
        let bestIndex = activePageRef.current;
        let bestDistance = Number.POSITIVE_INFINITY;

        pageRefs.current.forEach((pageEl, index) => {
          if (!pageEl) return;
          const rect = pageEl.getBoundingClientRect();
          if (rect.bottom < rootTop || rect.top > rootRect.bottom) return;
          const distance = Math.abs(rect.top - rootMid);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });

        const pageTop = getPageTop(bestIndex, root);
        return { index: bestIndex, offset: root.scrollTop - pageTop };
      }, [getPageTop, getRoot]);

      const restoreAnchor = useCallback((anchor: ScrollAnchor | null) => {
        if (!anchor) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const root = getRoot();
            const pageEl = pageRefs.current[anchor.index];
            if (!root || !pageEl) return;
            root.scrollTop = Math.max(0, getPageTop(anchor.index, root) + anchor.offset);
          });
        });
      }, [getPageTop, getRoot]);

      const updateViewportState = useCallback(() => {
        const root = getRoot();
        const total = pagesRef.current.length;
        if (!root || total === 0) return;

        const rootRect = root.getBoundingClientRect();
        let firstVisible = total;
        let lastVisible = 0;
        let bestIndex = activePageRef.current;
        let bestOverlap = -1;

        pageRefs.current.forEach((pageEl, index) => {
          if (!pageEl) return;
          const rect = pageEl.getBoundingClientRect();
          const overlap = Math.max(0, Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top));
          if (overlap > 0) {
            firstVisible = Math.min(firstVisible, index);
            lastVisible = Math.max(lastVisible, index);
          }
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestIndex = index;
          }
        });

        if (firstVisible === total) {
          firstVisible = Math.max(0, Math.min(total - 1, activePageRef.current));
          lastVisible = firstVisible;
        }

        const nextRange = {
          start: Math.max(0, firstVisible - PAGE_OVERSCAN),
          end: Math.min(total - 1, lastVisible + PAGE_OVERSCAN),
        };

        setVirtualRange((prev) => prev.start === nextRange.start && prev.end === nextRange.end ? prev : nextRange);

        if (bestIndex !== activePageRef.current && bestIndex >= 0 && bestIndex < total) {
          activePageRef.current = bestIndex;
          onActivePageChange?.(bestIndex);
        }
      }, [getRoot, onActivePageChange]);

      const renderPage = useCallback(async (index: number, version: number) => {
        const pdf = pdfDocRef.current;
        if (!pdf || index < 0 || index >= pdf.numPages) return;
        const currentPage = pagesRef.current[index];
        if (currentPage?.src && currentPage.version === version) return;
        if (renderingPagesRef.current.has(index)) return;

        renderingPagesRef.current.add(index);
        const startedAt = performance.now();
        try {
          const page = await pdf.getPage(index + 1);
          if (version !== renderTaskRef.current || pdfDocRef.current !== pdf) return;

          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const scale = 1.2 * dpr;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) return;

          await page.render({ canvasContext: ctx, viewport }).promise;
          if (version !== renderTaskRef.current || pdfDocRef.current !== pdf) return;

          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
          if (!blob || version !== renderTaskRef.current) return;

          const url = URL.createObjectURL(blob);
          setPages((prev) => {
            const previous = prev[index];
            if (!previous) {
              revokeSoon(url);
              return prev;
            }
            if (previous.src && previous.src !== url) revokeSoon(previous.src);
            const next = [...prev];
            next[index] = { ...previous, src: url, version };
            return next;
          });

          // Record render time for the metrics HUD (keep last 20 samples).
          const elapsed = performance.now() - startedAt;
          const samples = renderTimesRef.current;
          samples.push(elapsed);
          if (samples.length > 20) samples.shift();
        } catch (error) {
          console.error(`PDF page ${index + 1} render error:`, error);
        } finally {
          renderingPagesRef.current.delete(index);
        }
      }, []);

      const pumpQueue = useCallback(async () => {
        if (queueRunningRef.current) return;
        queueRunningRef.current = true;
        try {
          while (renderQueueRef.current.length > 0) {
            const index = renderQueueRef.current.shift();
            if (typeof index !== 'number') continue;
            await renderPage(index, renderTaskRef.current);
            await nextFrame();
          }
        } finally {
          queueRunningRef.current = false;
        }
      }, [renderPage]);

      const enqueuePages = useCallback((indices: number[]) => {
        const version = renderTaskRef.current;
        const currentPages = pagesRef.current;
        const queue = renderQueueRef.current;
        indices.forEach((index) => {
          if (index < 0 || index >= currentPages.length) return;
          const page = currentPages[index];
          if (page?.src && page.version === version) return;
          if (renderingPagesRef.current.has(index) || queue.includes(index)) return;
          queue.push(index);
        });
        void pumpQueue();
      }, [pumpQueue]);

      useImperativeHandle(ref, () => ({
        scrollToPage: (i: number) => {
          const el = pageRefs.current[i];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      }));

      useEffect(() => {
        if (!pdfBlobUrl) {
          renderTaskRef.current += 1;
          renderQueueRef.current = [];
          renderingPagesRef.current.clear();
          pagesRef.current.forEach((page) => revokeSoon(page.src));
          pagesRef.current = [];
          setPages([]);
          onPagesChange?.(0);
          setLoading(false);
          return;
        }

        const taskId = ++renderTaskRef.current;
        renderQueueRef.current = [];
        renderingPagesRef.current.clear();
        if (pagesRef.current.length === 0) setLoading(true);

        const loadPdf = async () => {
          try {
            const response = await fetch(pdfBlobUrl);
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            if (taskId !== renderTaskRef.current) return;
            if (pdfDocRef.current && pdfDocRef.current !== pdf) {
              try { await pdfDocRef.current.destroy?.(); } catch {}
            }
            pdfDocRef.current = pdf;

            const metas: RenderedPage[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              if (taskId !== renderTaskRef.current) return;
              const viewport = page.getViewport({ scale: 1 });
              metas.push({ width: viewport.width, height: viewport.height });
              await nextFrame();
            }

            if (taskId !== renderTaskRef.current) return;

            pendingAnchorRef.current = captureAnchor();
            setPages((prev) => metas.map((meta, index) => {
              const previous = prev[index];
              if (index === metas.length - 1 && prev.length > metas.length) {
                prev.slice(metas.length).forEach((oldPage) => revokeSoon(oldPage.src));
              }
              return {
                ...meta,
                // Keep the old page image visible until the matching new page is
                // ready. This prevents the scroll container from collapsing or
                // flashing while a fresh PDF is being prepared.
                src: previous?.src,
                version: previous?.version,
              };
            }));
            onPagesChange?.(metas.length);

            const active = Math.max(0, Math.min(metas.length - 1, activePageRef.current));
            const priority = [active, active - 1, active + 1, active - 2, active + 2]
              .filter((index) => index >= 0 && index < metas.length);
            enqueuePages(priority);
          } catch (err) {
            console.error('PDF render error:', err);
          } finally {
            if (taskId === renderTaskRef.current) setLoading(false);
          }
        };

        loadPdf();
      }, [pdfBlobUrl, captureAnchor, enqueuePages, onPagesChange]);

      useEffect(() => {
        const anchor = pendingAnchorRef.current;
        if (!anchor || pages.length === 0) return;
        pendingAnchorRef.current = null;
        restoreAnchor(anchor);
        requestAnimationFrame(updateViewportState);
      }, [pages, restoreAnchor, updateViewportState]);

      useEffect(() => {
        const root = getRoot();
        if (!root || pages.length === 0) return;
        let raf = 0;
        const onScroll = () => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            updateViewportState();
          });
        };

        root.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        requestAnimationFrame(updateViewportState);

        return () => {
          if (raf) cancelAnimationFrame(raf);
          root.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        };
      }, [getRoot, pages.length, updateViewportState]);

      useEffect(() => {
        if (pages.length === 0) return;
        const active = activePageRef.current;
        const visible = [];
        for (let i = virtualRange.start; i <= virtualRange.end; i++) visible.push(i);
        visible.sort((a, b) => Math.abs(a - active) - Math.abs(b - active));
        enqueuePages(visible);
      }, [enqueuePages, pages.length, virtualRange]);

      // FPS + dropped-frame monitor. Uses rAF timing; anything >24ms between
      // frames counts as a drop, which is a decent smoothness proxy in the
      // browser main thread.
      useEffect(() => {
        if (!onMetricsRef.current) return;
        let lastTs = performance.now();
        let emitAcc = 0;
        const tick = (now: number) => {
          const delta = now - lastTs;
          lastTs = now;
          if (delta > 24) frameDropsRef.current += 1;
          fpsRef.current = delta > 0 ? Math.min(120, Math.round(1000 / delta)) : fpsRef.current;
          emitAcc += delta;
          if (emitAcc >= 500) {
            emitAcc = 0;
            const samples = renderTimesRef.current;
            const last = samples[samples.length - 1] ?? 0;
            const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
            const mounted = Math.max(0, virtualRange.end - virtualRange.start + 1);
            onMetricsRef.current?.({
              lastRenderMs: Math.round(last),
              avgRenderMs: Math.round(avg),
              mountedPages: mounted,
              totalPages: pagesRef.current.length,
              frameDrops: frameDropsRef.current,
              fps: fpsRef.current,
            });
          }
          metricsRafRef.current = requestAnimationFrame(tick);
        };
        metricsRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(metricsRafRef.current);
      }, [virtualRange.end, virtualRange.start]);

      useEffect(() => {
        return () => {
          renderTaskRef.current += 1;
          renderQueueRef.current = [];
          pagesRef.current.forEach((page) => revokeSoon(page.src));
          try { pdfDocRef.current?.destroy?.(); } catch {}
        };
      }, []);

      if (loading && pages.length === 0) {
        return (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Rendering preview...</p>
            </div>
          </div>
        );
      }

      if (pages.length === 0) {
        return (
          <div className="h-full flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-muted-foreground">No preview available</p>
          </div>
        );
      }

      return (
        <div ref={containerRef} className="relative flex flex-col items-center gap-8">
          {isGenerating && (
            <div className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-md border">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] text-muted-foreground">Updating…</span>
            </div>
          )}
          {pages.map((page, i) => {
            const isMounted = i >= virtualRange.start && i <= virtualRange.end;
            const aspectRatio = `${page.width || PAGE_WIDTH_PT} / ${page.height || 842}`;
            return (
            <div
              key={i}
              ref={el => (pageRefs.current[i] = el)}
              data-page-idx={i}
              data-testid={`pdf-page-${i}`}
              className="relative rounded-lg shadow-lg border bg-white scroll-mt-4 overflow-hidden select-none"
              style={{ ...pageWidthStyle, aspectRatio, contain: 'layout paint size' }}
            >
              {isMounted && page.src ? (
                <img
                  src={page.src}
                  alt={`PDF page ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-fill"
                />
              ) : isMounted ? (
                // Mobile-friendly skeleton shown while a nearby page renders.
                // Shimmer conveys progress; page-header/footer bars keep the
                // silhouette recognisable so scrolling feels stable.
                <div
                  role="status"
                  aria-label={`Loading page ${i + 1}`}
                  className="absolute inset-0 overflow-hidden bg-muted/40"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,hsl(var(--muted-foreground)/0.12)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
                  <div className="absolute top-6 left-6 right-6 h-3 rounded bg-muted-foreground/15" />
                  <div className="absolute top-12 left-6 w-2/3 h-3 rounded bg-muted-foreground/10" />
                  <div className="absolute bottom-6 left-6 right-6 h-3 rounded bg-muted-foreground/10" />
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      );
    }
  )
);

PDFCanvasPreview.displayName = 'PDFCanvasPreview';
