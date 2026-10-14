"use client";

import dynamic from "next/dynamic";

// pdf.js uses browser APIs at module evaluation time.
export const PDFCanvasPreview = dynamic(
  () => import("@/components/PDFCanvasPreview").then(module => module.PDFCanvasPreview),
  { ssr: false },
);
