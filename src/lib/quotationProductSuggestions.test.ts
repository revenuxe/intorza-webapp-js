import { libraryProductSuggestions, filterProductSuggestions, suggestionAutofill } from './quotationProductSuggestions';
import { masterProducts, masterCategories, type Entries } from './library/model';
const empty = { productDetails: '', measurementUnit: 'Sq.ft', widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0 };
it('offers the master catalog to guests, including wardrobe matches for war', () => {
  const products = libraryProductSuggestions({}); expect(products).toHaveLength(800);
  expect(filterProductSuggestions(products, 'war').some(product => /wardrobe/i.test(product.product_name))).toBe(true);
});
it('uses personal rates/specifications and excludes archived products and hidden categories', () => {
  const product = masterProducts[0];
  const entries: Entries = { [product.id]: { id: product.id, kind: 'product', revision: '1', data: { ...product, rate: 1450, specifications: [{ label: 'Material', value: 'BWR Plywood' }] } } };
  const suggestion = libraryProductSuggestions(entries).find(row => row.id === product.id)!;
  expect(suggestion.preferred_rate).toBe(1450); expect(suggestion.product_details).toContain('Material: BWR Plywood');
  expect(filterProductSuggestions(libraryProductSuggestions(entries), 'BWR Plywood')).toContainEqual(suggestion);
  entries[product.id] = { ...entries[product.id], data: { ...product, hidden: true } };
  expect(libraryProductSuggestions(entries).some(row => row.id === product.id)).toBe(false);
  const category = masterCategories[1];
  entries[category.id] = { id: category.id, kind: 'category', revision: '2', data: { ...category, hidden: true } };
  expect(libraryProductSuggestions(entries).some(row => row.category === category.name)).toBe(false);
});
it('fills a pristine item with the correct billing unit, details and rate', () => {
  const updates = suggestionAutofill(empty, { product_name: 'Light', product_details: 'Specifications:\nBrand: Test', preferred_rate: 250, usage_count: 0, measurement_unit: 'Nos' });
  expect(updates).toEqual([{ field: 'measurementUnit', value: 'Nos' }, { field: 'productDetails', value: 'Specifications:\nBrand: Test' }, { field: 'ratePerSft', value: 250 }]);
});
it('preserves entered work and never applies a per-item price to existing square feet', () => {
  expect(suggestionAutofill({ ...empty, productDetails: 'Existing details', widthFt: 4, heightFt: 5, sftArea: 20, ratePerSft: 800 }, { product_name: 'Light', product_details: 'Other details', preferred_rate: 250, usage_count: 0, measurement_unit: 'Nos' })).toEqual([]);
  expect(suggestionAutofill({ ...empty, sftArea: 20 }, { product_name: 'Light', product_details: null, preferred_rate: 250, usage_count: 0, measurement_unit: 'Nos' })).toEqual([]);
});
it('keeps unset rates unset and permits an explicitly configured zero rate', () => {
  expect(suggestionAutofill(empty, { product_name: 'Test', product_details: null, preferred_rate: null, usage_count: 0 })).toEqual([]);
  expect(suggestionAutofill(empty, { product_name: 'Test', product_details: null, preferred_rate: 0, usage_count: 0 })).toEqual([{ field: 'ratePerSft', value: 0 }]);
});
