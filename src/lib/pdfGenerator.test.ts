import { TextDecoder, TextEncoder } from 'node:util';
import { defaultEditorSettings } from './pdfThemes';
import type { QuotationData } from './pdfGenerator';

Object.assign(globalThis, { TextDecoder, TextEncoder });

let generateQuotationPDF: typeof import('./pdfGenerator').generateQuotationPDF;

beforeAll(async () => {
  ({ generateQuotationPDF } = await import('./pdfGenerator'));
});

const quotationData: QuotationData = {
  quotationTitle: 'Preview settings regression',
  clientName: 'Example Client',
  clientAddress: 'Example address',
  dateOfProposal: '2026-10-14',
  quotationValidTill: '2026-10-21',
  placeOfProject: 'Test location',
  warranty: '10',
  projectType: 'Residential',
  sections: [{
    title: 'Test section',
    items: [{
      side: 'A',
      productName: 'Wardrobe',
      productDetails: 'Plywood with veneer finish',
      widthFt: 6,
      heightFt: 8,
      sftArea: 48,
      ratePerSft: 850,
      amount: 40800,
    }],
  }],
  subtotal: 40800,
  gstEnabled: false,
  gstRate: 18,
  grandTotal: 40800,
  companyName: 'Example Company',
  companyAddress: 'Example company address',
  editorSettings: {
    ...defaultEditorSettings,
    showDecorations: false,
    showPageBorder: false,
    showCornerOrnaments: false,
    showSectionDividers: false,
  },
  previewOnly: true,
};

describe('quotation PDF editor settings', () => {
  it.each([
    ['font size', { fontSize: 'large' as const }],
    ['page margins', { pageMargins: 'wide' as const }],
    ['table style', { tableStyle: 'minimal' as const }],
    ['header style', { headerStyle: 'underlined' as const }],
    ['summary position', { summaryStyle: 'center' as const }],
    ['compact mode', { compactMode: true }],
    ['card borders', { showBorders: false }],
  ])('changes the generated document when %s changes', async (_setting, editorUpdate) => {
    const defaultPDF = await generateQuotationPDF(quotationData);
    const updatedPDF = await generateQuotationPDF({
      ...quotationData,
      editorSettings: { ...quotationData.editorSettings!, ...editorUpdate },
    });

    expect(updatedPDF.output()).not.toBe(defaultPDF.output());
  });
});
