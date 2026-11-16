import { tierComparisonRows, tierQuotationTitle, type QuotationTier } from './quotationTiers';
it('labels exported tier titles without changing ordinary quotation titles', () => {
  expect(tierQuotationTitle('Bedroom','Luxury')).toBe('Bedroom — Luxury');
  expect(tierQuotationTitle('Bedroom',null)).toBe('Bedroom');
});
it('keeps missing items explicit in comparison slots', () => {
  const tiers = [
    { snapshot: { sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Wardrobe' },{ product_name: 'Bed' }] }] } },
    { snapshot: { sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Oak wardrobe' }] }] } },
  ] as QuotationTier[];
  const rows = tierComparisonRows(tiers);
  expect(rows[0].values).toEqual(['Bedroom · Wardrobe','Bedroom · Oak wardrobe']);
  expect(rows[1].values).toEqual(['Bedroom · Bed',null]);
});
