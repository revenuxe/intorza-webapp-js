import { matchingReferenceRate, referencePriceEvidence, type ReferencePrice } from './reference-pricing';
const row = (patch: Partial<ReferencePrice> = {}): ReferencePrice => ({
  id: 'laminate', product_name: 'wardrobe', material: 'laminate', specification: '18mm plywood',
  location: 'bengaluru', currency: 'INR', unit: 'sqft', tax: 'excluded', installation_included: true,
  section: 'Bedroom', project_type: 'Apartment', price_date: '2026-10-15', source_count: 8,
  median_rate: 1300, low_rate: 900, high_rate: 1800, recent_source_count: 5,
  recent_rate: 1400, recent_low: 1200, recent_high: 1600, ...patch,
});
it('uses the recent aggregate median with range and source count, accepting normalized cities', () => {
  const [price] = referencePriceEvidence([row()], 'INR', ' Bengaluru ');
  expect(price).toMatchObject({ rate: 1400, range: { low: 1200, high: 1600 }, confidence: 'medium' });
  expect(price.inclusions).toContain('5 comparable');
});
it.each([
  { currency: 'USD' }, { location: 'Mumbai' }, { unit: 'piece' }, { tax: 'included' },
  { installation_included: false }, { recent_source_count: 0 }, { recent_rate: null },
  { recent_rate: -1 }, { recent_low: 1, recent_high: 10000 },
])('leaves incompatible, stale or conflicting prices pending: %j', patch => {
  expect(referencePriceEvidence([row(patch)], 'INR', 'Bengaluru')).toEqual([]);
});
it('keeps different material variants separate and never selects one by product name alone', () => {
  const prices = referencePriceEvidence([row(), row({ id: 'acrylic', material: 'acrylic', recent_rate: 1600 })], 'INR', 'Bengaluru');
  expect(prices).toHaveLength(2);
  expect(matchingReferenceRate(prices, 'Wardrobe', 'acrylic. 18mm plywood')?.id).toBe('acrylic');
  expect(matchingReferenceRate(prices, 'Wardrobe', 'unspecified')).toBeUndefined();
});
