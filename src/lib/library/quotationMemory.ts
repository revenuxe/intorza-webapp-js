import { splitItemDetails } from '@/lib/itemSpecifications';
import { getQuotationUnit } from '@/lib/quotationUnits';
import { validateProduct, type Category, type Product, type Entry } from './model';

export type RememberedQuotationProduct = { productName: string; productDetails: string; measurementUnit?: string; ratePerSft: number | null };
export function rememberQuotationProduct(library: { products: Product[]; categories: Category[] }, item: RememberedQuotationProduct, selectedId?: string): Omit<Entry, 'revision'>[] {
  const name = item.productName.trim();
  if (!name || (item.ratePerSft !== null && (!Number.isFinite(item.ratePerSft) || item.ratePerSft < 0))) return [];
  const unit = getQuotationUnit(item.measurementUnit);
  const matches = library.products.filter(product => !product.hidden && product.name.trim().toLowerCase() === name.toLowerCase() && getQuotationUnit(product.unit === 'Litre' ? 'Ltr' : product.unit) === unit);
  const existing = matches.find(product => product.id === selectedId) || (!selectedId && matches.length === 1 ? matches[0] : undefined);
  if (!existing && matches.length > 1) return [];
  const categoryId = existing?.categoryId || 'quotation-products';
  const updates: Omit<Entry, 'revision'>[] = [];
  if (!library.categories.some(category => category.id === categoryId)) updates.push({ id: categoryId, kind: 'category', data: { id: categoryId, name: 'Quotation products', order: 1001, master: false } });
  const details = splitItemDetails(item.productDetails);
  const product = validateProduct({ ...existing, id: existing?.id || crypto.randomUUID(), categoryId, name, description: details.description, specifications: details.specifications, unit: unit === 'Ltr' ? 'Litre' : unit, rate: item.ratePerSft ?? existing?.rate ?? null, hidden: false, master: existing?.master || false, updatedAt: new Date().toISOString(), source: existing?.source || 'Quotation' });
  updates.push({ id: product.id, kind: 'product', data: product });
  return updates;
}
