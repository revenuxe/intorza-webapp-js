import { TextDecoder, TextEncoder } from 'node:util';
import {
  createPDFCurrencyFormatter,
  DEFAULT_NUMERIC_FONT,
  registerPDFCurrencyFont,
} from './pdfCurrencyFormatter';
import { NOTO_SANS_CURRENCY_BOLD_FONT_BASE64 } from './notoSansCurrencyBoldFont';
import { NOTO_SANS_CURRENCY_FONT_BASE64 } from './notoSansCurrencyFont';

Object.assign(globalThis, { TextEncoder, TextDecoder });

describe('PDF currency formatting', () => {
  it('uses a narrow attached space after the rupee symbol and Indian grouping', () => {
    const formatCurrency = createPDFCurrencyFormatter({
      currencyCode: 'INR',
      currencySymbol: '₹',
      locale: 'en-IN',
    });

    expect(formatCurrency(1234567)).toBe('₹\u202f12,34,567');
    expect(formatCurrency(-95.5, true)).toBe('-₹\u202f95.50');
  });

  it('keeps currency codes for symbols not included in the embedded font', () => {
    const formatCurrency = createPDFCurrencyFormatter({
      currencyCode: 'EUR',
      currencySymbol: '€',
      locale: 'en-IN',
    });

    expect(formatCurrency(950)).toBe('EUR\u202f950');
  });

  it('registers the embedded rupee-capable font with jsPDF', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    registerPDFCurrencyFont(doc);

    doc.setFont(DEFAULT_NUMERIC_FONT, 'bold');
    doc.text('₹\u202f95', 10, 10);

    expect(doc.getFont().fontName).toBe(DEFAULT_NUMERIC_FONT);
    expect(doc.output()).toContain(DEFAULT_NUMERIC_FONT);
    expect(doc.getFont().fontStyle).toBe('bold');
    expect(NOTO_SANS_CURRENCY_BOLD_FONT_BASE64).not.toBe(NOTO_SANS_CURRENCY_FONT_BASE64);
  });
});
