import { combineItemDetails } from './itemSpecifications';
import { getQuotationUnit } from './quotationUnits';
import { mergeLibrary, type Entries, type Product, type Category } from './library/model';

export type ProductSuggestion = {
  id?: string; product_name: string; product_details: string | null;
  preferred_rate: number | null; usage_count: number; category?: string;
  measurement_unit?: string;
  updated_at?: string | null;
};
export function libraryProductSuggestions(entries: Entries, legacy: Product[] = [], legacyCategories: Category[] = []): ProductSuggestion[] {
  const library = mergeLibrary(entries, legacy, legacyCategories);
  const categories = new Map(library.categories.map(category => [category.id, category]));
  return library.products.filter(product => !product.hidden && categories.has(product.categoryId) && !categories.get(product.categoryId)?.hidden).map(product => ({
    id: product.id, product_name: product.name,
    product_details: combineItemDetails(product.description, product.specifications) || null,
    preferred_rate: product.rate, usage_count: 0,
    updated_at: product.updatedAt,
    category: categories.get(product.categoryId)?.name,
    measurement_unit: getQuotationUnit(product.unit === 'Litre' ? 'Ltr' : product.unit),
  }));
}
export function filterProductSuggestions(patterns: ProductSuggestion[], search: string) {
  const term = search.toLowerCase().trim();
  if (!term) return [];
  const rank = (pattern: ProductSuggestion) => pattern.product_name.toLowerCase().startsWith(term) ? 0 : pattern.product_name.toLowerCase().includes(term) ? 1 : 2;
  return patterns.filter(pattern => [pattern.product_name, pattern.category, pattern.product_details].some(value => value?.toLowerCase().includes(term)))
    .sort((a, b) => Number(Boolean(b.updated_at)) - Number(Boolean(a.updated_at)) || (b.updated_at || '').localeCompare(a.updated_at || '') || rank(a) - rank(b) || b.usage_count - a.usage_count).slice(0, 40);
}
export function suggestionAutofill(item: { productDetails: string; measurementUnit?: string; widthFt: number; heightFt: number; sftArea: number; ratePerSft: number }, suggestion: ProductSuggestion) {
  const updates: { field: 'productDetails' | 'measurementUnit' | 'ratePerSft'; value: string | number }[] = [];
  let unit = getQuotationUnit(item.measurementUnit);
  const selectedUnit = suggestion.measurement_unit ? getQuotationUnit(suggestion.measurement_unit) : unit;
  if (selectedUnit !== unit && !item.widthFt && !item.heightFt && !item.sftArea && !item.ratePerSft) {
    updates.push({ field: 'measurementUnit', value: selectedUnit }); unit = selectedUnit;
  }
  if (suggestion.product_details && !item.productDetails.trim()) updates.push({ field: 'productDetails', value: suggestion.product_details });
  // A price per item must never be silently applied to existing square feet.
  if (suggestion.preferred_rate !== null && Number.isFinite(suggestion.preferred_rate) && suggestion.preferred_rate >= 0 && unit === selectedUnit) updates.push({ field: 'ratePerSft', value: suggestion.preferred_rate });
  return updates;
}
