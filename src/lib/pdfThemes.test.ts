import { getSelectableFontId, PDF_SELECTABLE_FONTS } from './pdfThemes';

describe('selectable PDF fonts', () => {
  it('offers distinct font families that render differently in the PDF', () => {
    expect(PDF_SELECTABLE_FONTS.map(font => font.family)).toEqual([
      'helvetica',
      'times',
      'courier',
    ]);
  });

  it('maps older font preferences to their actual PDF font family', () => {
    expect(getSelectableFontId('roboto')).toBe('helvetica');
    expect(getSelectableFontId('playfair')).toBe('times');
    expect(getSelectableFontId('fira-code')).toBe('courier');
  });
});
