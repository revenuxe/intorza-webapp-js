import { masterCategories, masterProducts, mergeLibrary, bulkPreview, parseRate, validateProduct, searchProduct, importEntries, legacyLibrary, type Entries } from './model';
describe('master product catalog', () => {
  it('has exactly 80 categories and 800 distinct products, ten per category, without fictional prices', () => {
    expect(masterCategories).toHaveLength(80); expect(masterProducts).toHaveLength(800);
    expect(new Set(masterProducts.map(row => row.id)).size).toBe(800);
    for (const category of masterCategories) expect(masterProducts.filter(row => row.categoryId === category.id)).toHaveLength(10);
    expect(masterProducts.every(row => row.rate === null && row.updatedAt === null && row.source === 'Intorza Catalog')).toBe(true);
    expect(masterProducts.find(row => row.name === 'LED Downlight')?.unit).toBe('Nos');
    expect(masterProducts.find(row => row.name === 'Tile Skirting')?.unit).toBe('R.ft');
    expect(masterProducts.find(row => row.name === 'RCC Slab')?.unit).toBe('Cu.m');
    expect(masterProducts.find(row => row.name === 'Site Supervision')?.unit).toBe('Day');
  });
  it('merges private overrides without mutating the catalog or duplicating IDs', () => {
    const product = masterProducts[0];
    const entries: Entries = { [product.id]: { id: product.id, kind: 'product', revision: '1', data: { ...product, rate: 1450 } } };
    const library = mergeLibrary(entries); expect(library.products).toHaveLength(800);
    expect(library.products.find(row => row.id === product.id)?.rate).toBe(1450);
    expect(product.rate).toBeNull();
    expect(mergeLibrary({ [product.id]: { ...entries[product.id], data: null } }).products[0].rate).toBeNull();
  });
});
describe('library editing', () => {
  it.each(['-1', '12.', 'abc', 'Infinity', '1e5'])('rejects invalid/incomplete rate %s', value => expect(() => parseRate(value)).toThrow());
  it('supports decimals, zero and an unset rate', () => { expect(parseRate('1450.50')).toBe(1450.5); expect(parseRate('0')).toBe(0); expect(parseRate('')).toBeNull(); });
  it('validates specifications and searches all required fields', () => {
    const product = { ...masterProducts[0], name: 'Wardrobe', specifications: [{ label: 'Brand', value: 'Greenply' }, { label: 'Material', value: 'BWR Plywood' }, { label: 'Finish', value: 'Acrylic' }] };
    for (const search of ['war', 'greenply', 'BWR', 'acrylic', 'joinery']) expect(searchProduct(product, 'Custom joinery', search)).toBe(true);
    expect(() => validateProduct({ ...product, specifications: [{ label: 'Brand', value: 'A' }, { label: 'brand', value: 'B' }] })).toThrow();
  });
  it('bulk edits only supplied products and rejects percentage operations without configured rates', () => {
    const product = { ...masterProducts[0], rate: 100 };
    expect(bulkPreview([product], 'increase', '5')[0].rate).toBe(105);
    expect(product.rate).toBe(100); expect(masterProducts[1].rate).toBeNull();
    expect(() => bulkPreview([masterProducts[1]], 'increase', '5')).toThrow('base rate');
    expect(bulkPreview([masterProducts[1]], 'increase', '5', '200')[0].rate).toBe(210);
    expect(() => bulkPreview([product], 'decrease', '101')).toThrow();
    expect(() => bulkPreview([{ ...product, master: false, id: 'custom' }], 'reset', '')).toThrow();
  });
  it('does not silently replace account overrides when importing and imports stable IDs only once', () => {
    const product = masterProducts[0];
    const account: Entries = { [product.id]: { id: product.id, kind: 'product', data: { ...product, rate: 200 }, revision: 'a' } };
    const guest: Entries = { [product.id]: { ...account[product.id], data: { ...product, rate: 100 }, revision: 'b' }, custom: { id: 'custom', kind: 'product', data: { ...product, id: 'custom', master: false }, revision: 'c' } };
    expect(importEntries(account, guest, new Set())[product.id]).toBe(account[product.id]);
    const imported = importEntries(account, guest, new Set([product.id]));
    expect(imported[product.id]).toBe(guest[product.id]);
    expect(Object.keys(importEntries(imported, guest, new Set()))).toHaveLength(2);
  });
  it('preserves existing learned products and rates separately from the master catalog', () => {
    const legacy = legacyLibrary([{ id: 'old', category: 'Kitchen', product_name: 'Custom cabinet', product_details: 'Existing details', default_rate: 200, preferred_rate: 250, updated_at: '2026-11-12' }]);
    const merged = mergeLibrary({}, legacy.products, legacy.categories);
    expect(merged.products).toHaveLength(801); expect(merged.products.find(row => row.id === 'legacy-old')?.rate).toBe(250);
  });
});
