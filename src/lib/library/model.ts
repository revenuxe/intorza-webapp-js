import catalog from './master-catalog.json';
import { itemSpecificationsSchema, splitItemDetails, type ItemSpecification } from '@/lib/itemSpecifications';

export const units = ['Sq.ft', 'Sq.m', 'R.ft', 'R.m', 'Nos', 'Set', 'Pair', 'Cu.ft', 'Cu.m', 'Kg', 'Litre', 'Day', 'Hour', 'Job', 'L.S.'] as const;
export type Category = { id: string; name: string; order: number; master: boolean; hidden?: boolean };
export type Product = { id: string; categoryId: string; name: string; description: string; unit: string; rate: number | null; specifications: ItemSpecification[]; hidden: boolean; master: boolean; updatedAt: string | null; source: string };
export type Entry = { id: string; kind: 'product' | 'category'; data: Product | Category | null; revision: string };
export type Entries = Record<string, Entry>;
export const masterCategories = catalog.categories as Category[];
export const masterProducts = catalog.products as Product[];
export function mergeLibrary(entries: Entries, legacy: Product[] = [], legacyCategories: Category[] = []) {
  const categories = new Map([...masterCategories, ...legacyCategories].map(row => [row.id, { ...row }]));
  const products = new Map([...masterProducts, ...legacy].map(row => [row.id, { ...row, specifications: row.specifications.map(field => ({ ...field })) }]));
  for (const entry of Object.values(entries)) {
    if (!entry.data) continue;
    if (entry.kind === 'category') categories.set(entry.id, entry.data as Category);
    else products.set(entry.id, entry.data as Product);
  }
  return { categories: [...categories.values()].sort((a, b) => a.order - b.order), products: [...products.values()] };
}
export function validateProduct(product: Product) {
  if (!product.name.trim() || product.name.length > 160) throw new Error('Enter a product name up to 160 characters.');
  if (!product.categoryId || !units.includes(product.unit as typeof units[number])) throw new Error('Choose a category and measurement unit.');
  if (product.rate !== null && (!Number.isFinite(product.rate) || product.rate < 0 || product.rate > 1e12)) throw new Error('Enter a valid non-negative rate.');
  if (product.description.length > 5000) throw new Error('Keep the description under 5,000 characters.');
  itemSpecificationsSchema.parse(product.specifications);
  return { ...product, name: product.name.trim() };
}
export function parseRate(text: string): number | null {
  if (!text.trim()) return null;
  if (!/^\d+(\.\d{1,4})?$/.test(text.trim())) throw new Error('Use a positive number with up to four decimal places, or leave blank.');
  const rate = Number(text);
  if (rate > 1e12) throw new Error('This rate is too large.');
  return rate;
}
export function searchProduct(product: Product, category: string, search: string) {
  const text = [product.name, product.description, category, ...product.specifications.flatMap(row => [row.label, row.value])].join(' ').toLocaleLowerCase();
  return search.toLocaleLowerCase().trim().split(/\s+/).every(term => text.includes(term));
}
export type BulkAction = 'rate' | 'increase' | 'decrease' | 'unit' | 'category' | 'hide' | 'reset';
export function bulkPreview(products: Product[], action: BulkAction, value: string, baseRate = '') {
  return products.map(product => {
    let next = { ...product };
    if (action === 'rate') next.rate = parseRate(value);
    if (action === 'increase' || action === 'decrease') {
      const percent = parseRate(value);
      if (percent === null || (action === 'decrease' && percent > 100)) throw new Error('Enter a percentage; decreases cannot exceed 100%.');
      const rate = product.rate ?? (baseRate.trim() ? parseRate(baseRate) : null);
      if (rate === null) throw new Error('Some selected products have no rate. Supply a base rate or deselect them.');
      next.rate = Math.round(rate * (1 + (action === 'increase' ? 1 : -1) * percent / 100) * 10000) / 10000;
    }
    if (action === 'unit') next.unit = value;
    if (action === 'category') next.categoryId = value;
    if (action === 'hide') next.hidden = true;
    if (action === 'reset') {
      const master = masterProducts.find(row => row.id === product.id);
      if (!master) throw new Error('Reset applies only to default catalog products. Deselect custom products.');
      next = { ...master, specifications: [] };
    }
    return validateProduct(next);
  });
}
export function legacyLibrary(rows: { id: string; category: string | null; product_name: string; product_details: string | null; preferred_rate: number | null; default_rate: number | null; updated_at: string }[]) {
  const categories = new Map<string, Category>();
  const products = rows.map(row => {
    const name = row.category || 'Existing library';
    const categoryId = 'legacy-category-' + encodeURIComponent(name.toLowerCase());
    categories.set(categoryId, { id: categoryId, name, master: false, order: 1000 });
    const details = splitItemDetails(row.product_details || '');
    return { id: 'legacy-' + row.id, name: row.product_name, categoryId, unit: 'Sq.ft', rate: row.preferred_rate ?? row.default_rate, description: details.description, specifications: details.specifications, hidden: false, master: false, updatedAt: row.updated_at, source: 'Existing account library' } as Product;
  });
  return { products, categories: [...categories.values()] };
}
export function importEntries(account: Entries, guest: Entries, replaceConflicts: Set<string>) {
  const imported = { ...account };
  for (const entry of Object.values(guest)) {
    if (!account[entry.id] || replaceConflicts.has(entry.id)) imported[entry.id] = entry;
  }
  return imported;
}
