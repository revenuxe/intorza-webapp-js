import { closeReferencePrice, matchingReferenceRate, referencePriceEvidence, type ReferencePrice } from './reference-pricing';
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
  expect(price.inclusions).toContain('5 admin-reviewed');
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
it.each([
  'accessories', 'hardware', 'package', 'kitchen accessories', 'cabinet hardware',
  'internal fittings', 'accessory bundle',
])('does not multiply legacy accessory/bundle amounts as sqft rates: %s', name => {
  expect(referencePriceEvidence([row({ product_name: name, recent_rate: 25000, recent_low: 25000, recent_high: 25000 })], 'INR', 'Bengaluru', true)).toEqual([]);
});
it('excludes high-rate accessory-like items that are lump-sum totals mislabelled as sqft', () => {
  expect(referencePriceEvidence([row({ product_name: 'internal basket', recent_rate: 22000, recent_low: 20000, recent_high: 25000 })], 'INR', 'Bengaluru', true)).toEqual([]);
  // Normal sqft rates for genuine cabinetry products remain available
  expect(referencePriceEvidence([row({ product_name: 'kitchen base cabinets', recent_rate: 1400, recent_low: 1200, recent_high: 1600 })], 'INR', 'Bengaluru', true)).toHaveLength(1);
});
it('maps kitchen cabinet library names to the builder canonical names', () => {
  const prices = referencePriceEvidence([row({ product_name: 'base unit' })], 'INR', 'Bengaluru');
  expect(matchingReferenceRate(prices, 'Kitchen base cabinets', 'laminate. 18mm plywood')?.rate).toBe(1400);
  expect(matchingReferenceRate(prices, 'kitchen base unit', 'laminate. 18mm plywood')?.rate).toBe(1400);
  expect(matchingReferenceRate(prices, 'upper cabinet', 'laminate. 18mm plywood')).toBeUndefined();
});
it('provides an explained close match based on product details without changing its observed price', () => {
  const prices = referencePriceEvidence([row()], 'INR', 'Bengaluru');
  const price = closeReferencePrice(prices, 'Wardrobe', '18mm plywood laminate wardrobe with shelving', 'INR', 'Bengaluru');
  expect(price).toMatchObject({ rate: 1400, name: 'Wardrobe', confidence: 'low', match: { type: 'close', referenceName: 'wardrobe' } });
  expect(price?.match?.assumptions.join(' ')).toContain('without a made-up markup');
});
it.each(['18mm MDF acrylic wardrobe', '12mm plywood laminate wardrobe', 'Quartz kitchen countertop'])('rejects incompatible or unsupported close matches: %s', specification => {
  const prices = referencePriceEvidence([row()], 'INR', 'Bengaluru');
  expect(closeReferencePrice(prices, 'Wardrobe', specification, 'INR', 'Bengaluru')).toBeUndefined();
});
it('fills an unambiguous product key from Bangalore references while disclosing unknown inclusions', () => {
  const prices = referencePriceEvidence([row({ product_name: 'TV Unit', location: 'bangalore', tax: 'unknown', installation_included: false })], 'INR', 'Bengaluru', true);
  expect(prices).toHaveLength(1);
  const price = closeReferencePrice(prices, 'tv_unit', 'unspecified', 'INR', 'Bengaluru');
  expect(price).toMatchObject({ rate: 1400, confidence: 'low', match: { type: 'close' } });
  expect(price?.basisWarnings).toHaveLength(2);
  expect(matchingReferenceRate(prices, 'tv_unit', 'laminate. 18mm plywood')?.rate).toBe(1400);
});
it('does not borrow another city or currency and refuses ambiguous material alternatives', () => {
  const prices = referencePriceEvidence([row(), row({ id: 'acrylic', material: 'acrylic', recent_rate: 2000 })], 'INR', 'Bengaluru');
  expect(closeReferencePrice(prices, 'Wardrobe', '18mm plywood wardrobe', 'INR', 'Bengaluru')).toBeUndefined();
  expect(closeReferencePrice(prices, 'Wardrobe', '18mm plywood laminate', 'USD', 'Bengaluru')).toBeUndefined();
  expect(closeReferencePrice(prices, 'Wardrobe', '18mm plywood laminate', 'INR', 'Mumbai')).toBeUndefined();
});
