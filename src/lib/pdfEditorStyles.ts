import type { PDFEditorSettings } from './pdfThemes';

const PAGE_MARGIN_PRESETS: Record<PDFEditorSettings['pageMargins'], number> = {
  narrow: 10,
  normal: 15,
  wide: 22,
};

export function getPDFLayoutMetrics(
  pageWidth: number,
  pageHeight: number,
  settings: Pick<PDFEditorSettings, 'pageMargins'>,
  borderInset = 0,
) {
  const baseMargin = PAGE_MARGIN_PRESETS[settings.pageMargins];
  const margin = borderInset > 0 ? Math.max(baseMargin, borderInset + 14) : baseMargin;
  const pageTopY = borderInset > 0
    ? Math.max(baseMargin, borderInset + 16)
    : baseMargin;
  const bottomInset = borderInset > 0
    ? borderInset + 40 + Math.max(0, baseMargin - 15)
    : 10 + Math.max(10, baseMargin - 5);

  return {
    margin,
    contentWidth: pageWidth - margin * 2,
    pageTopY,
    pageBottomY: pageHeight - bottomInset,
  };
}

export function getPDFTableTheme(style: PDFEditorSettings['tableStyle']): 'plain' | 'striped' | 'grid' {
  if (style === 'grid' || style === 'bordered') return 'grid';
  if (style === 'striped') return 'striped';
  return 'plain';
}

export function getPDFTableLineWidths(
  style: PDFEditorSettings['tableStyle'],
  showBorders: boolean,
) {
  if (!showBorders) return { cell: 0, table: 0 };
  if (style === 'grid') return { cell: 0.25, table: 0 };
  if (style === 'bordered') return { cell: 0.1, table: 0 };
  return { cell: 0, table: 0 };
}

export function getPDFSummaryLayout(
  pageWidth: number,
  margin: number,
  style: PDFEditorSettings['summaryStyle'],
) {
  const contentWidth = pageWidth - margin * 2;
  const tableWidth = style === 'full-width'
    ? contentWidth
    : contentWidth * (style === 'center' ? 0.8 : 0.65);

  return {
    tableWidth,
    left: style === 'center'
      ? (pageWidth - tableWidth) / 2
      : style === 'right'
        ? pageWidth - margin - tableWidth
        : margin,
  };
}

export function getPDFFontScale(size: PDFEditorSettings['fontSize']): number {
  if (size === 'small') return 0.9;
  if (size === 'large') return 1.1;
  return 1;
}
