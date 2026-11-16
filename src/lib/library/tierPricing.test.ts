import { masterProducts, productForTier, saveProductForTier, resetProductForTier, validateProduct, libraryTierForName, type Entries } from './model';
import { libraryProductSuggestions } from '../quotationProductSuggestions';
import { rememberQuotationProduct } from './quotationMemory';
const standard = { ...masterProducts[0], rate: 100, description: 'Plywood' };
it('keeps existing prices as Standard and leaves unconfigured tier prices unset', () => {
  expect(productForTier(standard,'standard').rate).toBe(100);
  expect(productForTier(standard,'luxury').rate).toBeNull();
  expect(productForTier(standard,'basic').rate).toBeNull();
  expect(libraryTierForName(' LUXURY ')).toBe('luxury');
  expect(libraryTierForName('Custom option')).toBe('standard');
});
it('stores rates and specifications independently and preserves other tiers on edit/reset', () => {
  const luxury = saveProductForTier(standard,{ ...standard, rate: 300, description: 'Oak veneer', specifications: [{ label: 'Finish', value: 'Premium' }] },'luxury');
  const both = saveProductForTier(luxury,{ ...productForTier(luxury,'basic'), rate: 50 },'basic');
  expect(both.rate).toBe(100);
  expect(productForTier(both,'luxury')).toMatchObject({ rate: 300, description: 'Oak veneer' });
  expect(productForTier(both,'basic').rate).toBe(50);
  const reset = resetProductForTier(both,'luxury');
  expect(productForTier(reset,'luxury').rate).toBeNull();
  expect(productForTier(reset,'basic').rate).toBe(50);
  expect(reset.rate).toBe(100);
  expect(productForTier(resetProductForTier(both,'standard'),'luxury').rate).toBe(300);
});
it('returns tier-specific suggestions and validates all variant prices', () => {
  const product = saveProductForTier(standard,{ ...standard, rate: 300 },'luxury');
  const entries: Entries = { [product.id]: { id: product.id, kind: 'product', data: product, revision: '1' } };
  expect(libraryProductSuggestions(entries,[],[],'luxury').find(row => row.id === product.id)?.preferred_rate).toBe(300);
  expect(libraryProductSuggestions(entries,[],[],'standard').find(row => row.id === product.id)?.preferred_rate).toBe(100);
  expect(() => validateProduct({ ...product, tierPrices: { luxury: { ...product.tierPrices!.luxury!, rate: -1 } } })).toThrow();
});
it('learns quotation edits only into the selected tier, including zero rates', () => {
  const updates = rememberQuotationProduct({ products: [standard], categories: [{ id: standard.categoryId, name: 'Test', order: 1, master: false }] },{ productName: standard.name, productDetails: 'Luxury details', measurementUnit: standard.unit, ratePerSft: 0 },standard.id,'luxury');
  expect(updates.at(-1)?.data).toMatchObject({ rate: 100, tierPrices: { luxury: { rate: 0, description: 'Luxury details' } } });
});
