import {
  getPDFFontScale,
  getPDFLayoutMetrics,
  getPDFSummaryLayout,
  getPDFTableLineWidths,
  getPDFTableTheme,
} from './pdfEditorStyles';

describe('PDF editor style settings', () => {
  it('applies the selected page margins while preserving decoration clearance', () => {
    expect(getPDFLayoutMetrics(210, 297, { pageMargins: 'narrow' }).margin).toBe(10);
    expect(getPDFLayoutMetrics(210, 297, { pageMargins: 'wide' }).margin).toBe(22);
    expect(getPDFLayoutMetrics(210, 297, { pageMargins: 'narrow' }, 12).margin).toBe(26);
  });

  it('maps each table style to its intended rendering and border treatment', () => {
    expect(getPDFTableTheme('minimal')).toBe('plain');
    expect(getPDFTableTheme('striped')).toBe('striped');
    expect(getPDFTableTheme('bordered')).toBe('grid');
    expect(getPDFTableTheme('grid')).toBe('grid');
    expect(getPDFTableLineWidths('bordered', true)).toEqual({ cell: 0.1, table: 0 });
    expect(getPDFTableLineWidths('grid', true)).toEqual({ cell: 0.25, table: 0 });
    expect(getPDFTableLineWidths('grid', false)).toEqual({ cell: 0, table: 0 });
  });

  it('positions summary tables for each alignment option', () => {
    expect(getPDFSummaryLayout(210, 15, 'right').left).toBeGreaterThan(15);
    expect(getPDFSummaryLayout(210, 15, 'center').left).toBeCloseTo(33);
    expect(getPDFSummaryLayout(210, 15, 'full-width')).toEqual({
      tableWidth: 180,
      left: 15,
    });
  });

  it('scales the entire PDF font size consistently', () => {
    expect(getPDFFontScale('small')).toBe(0.9);
    expect(getPDFFontScale('medium')).toBe(1);
    expect(getPDFFontScale('large')).toBe(1.1);
  });
});
