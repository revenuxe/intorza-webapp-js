import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFCanvasPreviewProps {
  pdfBlobUrl: string | null;
  zoom: number;
  isGenerating?: boolean;
}

export const PDFCanvasPreview = ({ pdfBlobUrl, zoom, isGenerating }: PDFCanvasPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [loading, setLoading] = useState(false);
  const renderTaskRef = useRef<number>(0);

  useEffect(() => {
    if (!pdfBlobUrl) {
      setPages([]);
      return;
    }

    const taskId = ++renderTaskRef.current;
    setLoading(true);

    const renderPdf = async () => {
      try {
        const response = await fetch(pdfBlobUrl);
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (taskId !== renderTaskRef.current) return; // stale

        const canvases: HTMLCanvasElement[] = [];
        const scale = 2; // retina quality

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (taskId !== renderTaskRef.current) return;

          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;

          await page.render({ canvasContext: ctx, viewport }).promise;
          canvases.push(canvas);
        }

        if (taskId === renderTaskRef.current) {
          setPages(canvases);
        }
      } catch (err) {
        console.error('PDF render error:', err);
      } finally {
        if (taskId === renderTaskRef.current) {
          setLoading(false);
        }
      }
    };

    renderPdf();
  }, [pdfBlobUrl]);

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
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {isGenerating && (
        <div className="sticky top-2 z-10 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[10px] text-muted-foreground">Updating...</span>
        </div>
      )}
      {pages.map((canvas, i) => (
        <CanvasPage key={i} canvas={canvas} zoom={zoom} />
      ))}
    </div>
  );
};

function CanvasPage({ canvas, zoom }: { canvas: HTMLCanvasElement; zoom: number }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState('');

  useEffect(() => {
    setSrc(canvas.toDataURL('image/png'));
  }, [canvas]);

  if (!src) return null;

  return (
    <img
      ref={imgRef}
      src={src}
      alt="PDF page"
      className="rounded-lg shadow-lg border bg-white"
      style={{
        width: `min(100%, ${595 * (zoom / 100)}px)`,
      }}
    />
  );
}
