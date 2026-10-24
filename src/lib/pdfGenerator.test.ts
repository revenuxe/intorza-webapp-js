import { combineItemDetails } from './itemSpecifications';
import { getQuotationSettings } from '@/components/CustomizeFieldsDrawer';
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
  it.each([false, true])('fills every room heading with the custom accent (simple layout: %s)', async (useSimpleItemLayout) => {
    const pdf = await generateQuotationPDF({
      ...quotationData,
      settings: { ...getQuotationSettings(), useSimpleItemLayout },
      sections: [quotationData.sections[0], { ...quotationData.sections[0], title: 'Second room' }],
      editorSettings: {
        ...quotationData.editorSettings!,
        roomHeadingBackground: true,
        customColors: { accent: '#123456' },
      },
    });
    const pages = pdf.internal.pages.flat().join('\n');
    expect(pages.match(/0\.07 0\.2 0\.34 rg/g)).toHaveLength(2);
    for (const title of ['TEST SECTION', 'SECOND ROOM']) {
      const titlePosition = pages.indexOf(`(${title})`);
      expect(titlePosition).toBeGreaterThan(0);
      const fillPosition = pages.lastIndexOf('0.07 0.2 0.34 rg', titlePosition);
      const precedingCommands = pages.slice(fillPosition, titlePosition);
      // Both headings receive the same custom fill, a filled card, and white text.
      expect(precedingCommands).toMatch(/0\.07 0\.2 0\.34 rg[\s\S]*\nf\nBT\n[\s\S]*1\. g/);
    }
  });

  it('wraps long room headings within the card and keeps the table below it', async () => {
    const pdf = await generateQuotationPDF({
      ...quotationData,
      sections: [{ ...quotationData.sections[0], title: 'Premium dining and display room '.repeat(8) }],
      editorSettings: {
        ...quotationData.editorSettings!,
        roomHeadingBackground: true,
        fontSize: 'large',
        pageMargins: 'wide',
        compactMode: true,
      },
    });
    const pages = pdf.internal.pages.flat().join('\n');
    expect(pages).toContain('PREMIUM DINING');
    expect(pages).toContain('T*');
    expect(pages.indexOf('(Product)')).toBeGreaterThan(pages.indexOf('PREMIUM DINING'));
  });
  it('prints area without width/height columns for an area-only quotation', async () => {
    const pdf = await generateQuotationPDF({ ...quotationData, settings: { ...getQuotationSettings(), showProjectDetails: true, areaOnly: true } });
    const output = pdf.internal.pages.flat().join("\n");
    expect(output).toContain('Sq.ft');
    expect(output).not.toContain('W \\(ft\\)');
    expect(output).not.toContain('H \\(ft\\)');
  });
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

// Verify actual document content across the supported item layouts.
it.each([
  { useSimpleItemLayout: true },
  { showDetailedSizeColumns: true },
  { areaOnly: true },
  { showDetailedSizeColumns: false, areaOnly: false },
])('exports mixed units without including counts in project area: %j', async layout => {
  const base = quotationData.sections[0].items[0];
  const pdf = await generateQuotationPDF({ ...quotationData,
    settings: { ...getQuotationSettings(), ...layout },
    sections: [{ title: 'Mixed units', items: [
      { ...base, measurementUnit: 'Sq.m', sftArea: 2, widthFt: 1, heightFt: 2 },
      { ...base, productName: 'Lights', measurementUnit: 'Nos', sftArea: 4, widthFt: 0, heightFt: 0 },
      { ...base, productName: 'Installation', measurementUnit: 'L.S.', sftArea: 1, widthFt: 0, heightFt: 0 },
    ] }],
  });
  const output = pdf.internal.pages.flat().join('\n');
  const itemText = [...output.matchAll(/\(([^)]*)\) Tj/g)].map(match => match[1]).join(' ');
  expect(itemText).toContain('2.00 Sq.m');
  expect(itemText).toContain('4.00 Nos');
  expect(itemText).toContain('1.00 L.S.');

});

it.each([true, false])('prints optional item specifications beneath the description (simple layout: %s)', async useSimpleItemLayout => {
  const productDetails = combineItemDetails('4-door wardrobe with loft', [
    { label: 'Material', value: 'BWP Plywood' }, { label: 'Brand', value: 'Century' }, { label: 'Warranty', value: '10 years' },
  ]);
  const pdf = await generateQuotationPDF({ ...quotationData,
    settings: { ...getQuotationSettings(), useSimpleItemLayout, showProductDetails: true },
    sections: [{ ...quotationData.sections[0], items: [{ ...quotationData.sections[0].items[0], productDetails }] }],
  });
  const output = pdf.internal.pages.flat().join('\n');
  expect(output).toContain('Specifications:');
  expect(output).toContain('Material:');
  expect(output).toContain('Century');
  expect(output).toContain('Warranty:');
});

it.each([true, false])('exports canonical structured specifications without a legacy text suffix (simple: %s)', async useSimpleItemLayout => {
  const pdf = await generateQuotationPDF({ ...quotationData,
    settings: { ...getQuotationSettings(), useSimpleItemLayout, showProductDetails: true },
    sections: [{ ...quotationData.sections[0], items: [{ ...quotationData.sections[0].items[0], productDetails: '4-door wardrobe', specifications: [{ label: 'Brand', value: 'Century' }, { label: 'Colour / Code', value: '0954' }] }] }],
  });
  const output = pdf.internal.pages.flat().join('\n');
  expect(output).toContain('Century'); expect(output).toContain('0954');
});
