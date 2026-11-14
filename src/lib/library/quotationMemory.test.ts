import { rememberQuotationProduct } from './quotationMemory';
import { mergeLibrary, masterProducts, type Entries, type Product } from './model';
import { filterProductSuggestions, libraryProductSuggestions, suggestionAutofill } from '../quotationProductSuggestions';

const item = { productName: 'Custom wardrobe', productDetails: 'Plywood', measurementUnit: 'Sq.ft', ratePerSft: 1500 };
function apply(entries: Entries, updates: ReturnType<typeof rememberQuotationProduct>) {
  return { ...entries, ...Object.fromEntries(updates.map(entry => [entry.id, { ...entry, revision: '1' }])) };
}
it('remembers a custom product, ranks it first, and updates its price without duplicating it', () => {
  let entries = apply({}, rememberQuotationProduct(mergeLibrary({}), item));
  const first = filterProductSuggestions(libraryProductSuggestions(entries), 'ward')[0];
  expect(first).toMatchObject({ product_name: item.productName, preferred_rate: 1500 });
  entries = apply(entries, rememberQuotationProduct(mergeLibrary(entries), { ...item, ratePerSft: 1800 }, first.id));
  expect(Object.values(entries).filter(entry => entry.kind === 'product')).toHaveLength(1);
  const selected = filterProductSuggestions(libraryProductSuggestions(entries), 'ward')[0];
  expect(selected.preferred_rate).toBe(1800);
  expect(suggestionAutofill({ productDetails: '', widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 100 }, selected)).toContainEqual({ field: 'ratePerSft', value: 1800 });
});
it('updates the selected catalog product and keeps zero rates', () => {
  const original = masterProducts[0];
  const updates = rememberQuotationProduct(mergeLibrary({}), { ...item, productName: original.name, measurementUnit: original.unit, ratePerSft: 0 }, original.id);
  expect(updates).toHaveLength(1);
  expect(updates[0].data).toMatchObject({ id: original.id, rate: 0, categoryId: original.categoryId });
});
it('does not change prices for another unit or guess between duplicate names', () => {
  const base: Product = { ...masterProducts[0], id: 'one', name: item.productName, unit: 'Sq.ft', rate: 200 };
  const library = { products: [base, { ...base, id: 'two', categoryId: 'other' }], categories: mergeLibrary({}).categories };
  expect(rememberQuotationProduct(library, item)).toEqual([]);
  expect(rememberQuotationProduct(library, item, 'two').at(-1)?.data).toMatchObject({ id: 'two', rate: 1500 });
  const otherUnit = rememberQuotationProduct({ ...library, products: [base] }, { ...item, measurementUnit: 'Nos' });
  expect(otherUnit.at(-1)?.data).toMatchObject({ unit: 'Nos', rate: 1500 });
  expect(otherUnit.at(-1)?.id).not.toBe(base.id);
});
it('ranks recent selections above older matching products', () => {
  expect(filterProductSuggestions([
    { product_name: 'Wall breaking', product_details: null, preferred_rate: null, usage_count: 0 },
    { product_name: 'Wardrobe', product_details: null, preferred_rate: 1600, usage_count: 0, updated_at: '2026-11-14T09:00:00Z' },
    { product_name: 'Wall panel', product_details: null, preferred_rate: 100, usage_count: 0, updated_at: '2026-11-13T09:00:00Z' },
  ], 'wa').map(row => row.product_name)).toEqual(['Wardrobe', 'Wall panel', 'Wall breaking']);
});
