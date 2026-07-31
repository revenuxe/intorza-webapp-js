import {
  InvoiceData,
  LayoutContext,
  buildLayoutContext,
  renderTermsAndConditions,
  renderBankDetails,
  renderSignatureArea,
  renderFooter,
} from './invoiceLayouts/shared';
import { renderClassicHeaderAndSummary } from './invoiceLayouts/classicLayout';
import { renderMinimalModernHeaderAndSummary } from './invoiceLayouts/minimalModernLayout';
import { renderHeroBannerHeaderAndSummary } from './invoiceLayouts/heroBannerLayout';

export type { InvoiceData };

const LAYOUT_RENDERERS: Record<string, (ctx: LayoutContext) => Promise<number>> = {
  classic: renderClassicHeaderAndSummary,
  'minimal-modern': renderMinimalModernHeaderAndSummary,
  'hero-banner': renderHeroBannerHeaderAndSummary,
};

export const generateInvoicePDF = async (data: InvoiceData) => {
  const ctx = buildLayoutContext(data);
  const { doc } = ctx;

  const layoutStyle = ctx.editorSettings?.invoiceLayoutStyle ?? 'classic';
  const renderHeaderAndSummary = LAYOUT_RENDERERS[layoutStyle] ?? renderClassicHeaderAndSummary;

  let yPosition = await renderHeaderAndSummary(ctx);
  yPosition = await renderTermsAndConditions(ctx, yPosition);
  yPosition = await renderBankDetails(ctx, yPosition);
  yPosition = await renderSignatureArea(ctx, yPosition);
  renderFooter(ctx);

  // If previewOnly, return doc without saving
  if (data.previewOnly) {
    return doc;
  }

  // Generate PDF and handle sharing + download
  const fileName = `Invoice_${data.invoiceNumber}.pdf`;
  const pdfBlob = doc.output('blob');

  // Always save the file first
  doc.save(fileName);

  // Then try Web Share API (primarily works on mobile)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const shareData = { files: [file], title: `Invoice ${data.invoiceNumber}` };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        console.log('Share failed:', error.message);
      }
    }
  }
};
