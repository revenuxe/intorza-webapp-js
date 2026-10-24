import { combineItemDetails, splitItemDetails, normalizeItemDetails, formatItemDetails, itemSpecificationsSchema } from './itemSpecifications';

it('round trips specifications with a multiline description through the existing details field', () => {
  const description = '4-door wardrobe with loft\nFull-height shutters';
  const specifications = [{ label: 'Material', value: 'BWP Plywood' }, { label: 'Brand', value: 'Century' }, { label: 'Colour / Code', value: 'Walnut 504' }];
  const saved = JSON.parse(JSON.stringify({ product_details: combineItemDetails(description, specifications) }));
  expect(saved.product_details).toContain('Specifications:\nMaterial: BWP Plywood');
  expect(splitItemDetails(saved.product_details)).toEqual({ description, specifications });
});
it('omits unused fields and preserves descriptions when no specifications were entered', () => {
  expect(combineItemDetails('Gypsum ceiling', [{ label: 'Brand', value: '' }])).toBe('Gypsum ceiling');
  expect(splitItemDetails('Gypsum ceiling')).toEqual({ description: 'Gypsum ceiling', specifications: [] });
});
it('does not consume a normal description with an incomplete specifications heading', () => {
  const text = 'Paint walls\n\nSpecifications:\nCheck with client';
  expect(splitItemDetails(text)).toEqual({ description: text, specifications: [] });
});
it('supports custom fields, colons in values, and specification-only items', () => {
  const specifications = [{ label: 'Model', value: 'Series: X10' }];
  expect(splitItemDetails(combineItemDetails('', specifications))).toEqual({ description: '', specifications });
});

it('formats canonical database metadata once, even when a legacy suffix is also supplied', () => {
  const specs = [{ label: 'Brand', value: 'Century' }];
  const legacy = combineItemDetails('Wardrobe', specs);
  expect(formatItemDetails(legacy, specs)).toBe(legacy);
  expect(normalizeItemDetails(legacy, [])).toEqual({ description: 'Wardrobe', specifications: [] });
});
it('rejects duplicate labels, unknown metadata shapes and more than twenty fields', () => {
  expect(itemSpecificationsSchema.safeParse([{ label: 'Brand', value: 'Century' }, { label: 'brand', value: 'Other' }]).success).toBe(false);
  expect(itemSpecificationsSchema.safeParse({ Brand: 'Century' }).success).toBe(false);
  expect(itemSpecificationsSchema.safeParse([{ label: 'Brand', value: '' }]).success).toBe(false);
  expect(itemSpecificationsSchema.safeParse(Array.from({ length: 21 }, (_, i) => ({ label: String(i), value: 'value' }))).success).toBe(false);
});
