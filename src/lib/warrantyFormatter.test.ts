import { formatWarrantyForPdf, normalizeWarrantyInput } from './warrantyFormatter';

describe('warranty formatting', () => {
  it.each([
    ['10', '10 Years'],
    ['10 Years', '10 Years'],
    ['10 yrs', '10 Years'],
    ['1', '1 Year'],
    ['1 Year', '1 Year'],
    ['  0  ', '0 Years'],
    ['Lifetime warranty', 'Lifetime warranty'],
    ['', ''],
  ])('formats %p as %p without duplicating the unit', (input, expected) => {
    expect(formatWarrantyForPdf(input)).toBe(expected);
  });

  it.each([
    ['10', '10'],
    ['10 Years', '10'],
    ['1 Year', '1'],
    ['Lifetime warranty', 'Lifetime warranty'],
  ])('normalizes %p for the numeric warranty field', (input, expected) => {
    expect(normalizeWarrantyInput(input)).toBe(expected);
  });
});
