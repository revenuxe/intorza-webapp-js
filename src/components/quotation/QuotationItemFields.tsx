'use client';
import { useId, useRef, type ComponentProps } from 'react';
import type { RememberedQuotationProduct } from '@/lib/library/quotationMemory';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AutoGrowTextarea } from '@/components/ui/auto-grow-textarea';
import { ProductNameInput } from './ProductNameInput';
import { ItemMeasurements } from './ItemMeasurements';
import { ItemSpecifications } from './ItemSpecifications';
import { ItemSideSelector } from './ItemSideSelector';
import { combineItemDetails, splitItemDetails } from '@/lib/itemSpecifications';
import { getQuotationUnit } from '@/lib/quotationUnits';
import { suggestionAutofill } from '@/lib/quotationProductSuggestions';
export type ItemField = 'productName' | 'productDetails' | 'side' | 'measurementUnit' | 'widthFt' | 'heightFt' | 'sftArea' | 'ratePerSft';
export type EditableQuotationItem = { productName: string; productDetails: string; side: string; measurementUnit?: string; widthFt: number; heightFt: number; sftArea: number; ratePerSft: number; amount: number };
export function QuotationItemFields({ item, onChange, onRemember, patterns = [], suggestionNotice, pending = false, currencySymbol = '\u20b9', locale = 'en-IN', showProductDetails = true, showSideColumn = true, compact = false, idPrefix }: {
  item: EditableQuotationItem; onChange: (field: ItemField, value: string | number) => void;
  patterns?: ComponentProps<typeof ProductNameInput>['patterns']; pending?: boolean;
  onRemember?: (item: RememberedQuotationProduct, selectedId?: string) => void;
  suggestionNotice?: string;
  currencySymbol?: string; locale?: string; showProductDetails?: boolean; showSideColumn?: boolean; compact?: boolean; idPrefix?: string;
}) {
  const generatedId = useId();
  const fieldId = idPrefix ?? generatedId;
  const details = splitItemDetails(item.productDetails);
  const selectedId = useRef<string | undefined>(undefined);
  const selecting = useRef(false);
  return <div className="contents" onBlur={event => {
    if (selecting.current) { selecting.current = false; return; }
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onRemember?.({ ...item, ratePerSft: item.ratePerSft || null }, selectedId.current);
  }}>
                  <div className={`grid gap-4 ${showProductDetails && !compact ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : ''}`}>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`product-name-${fieldId}`}>Product Name</Label>
                    <ProductNameInput id={`product-name-${fieldId}`} value={item.productName}
                      onChange={name => { selectedId.current = undefined; onChange('productName', name); }} patterns={patterns} notice={suggestionNotice}
                      onProductSelect={pattern => {
                        selecting.current = true;
                        selectedId.current = pattern.id;
                        for (const update of suggestionAutofill(item, pattern)) onChange(update.field, update.value);
                        onRemember?.({ productName: pattern.product_name, productDetails: pattern.product_details || '', measurementUnit: pattern.measurement_unit, ratePerSft: pattern.preferred_rate }, pattern.id);
                      }} placeholder="e.g. Wardrobe" />
                  </div>
                  {showProductDetails && <div className="min-w-0 space-y-2">
                    <Label htmlFor={`product-details-${fieldId}`}>Product Details</Label>
                    <AutoGrowTextarea id={`product-details-${fieldId}`} value={details.description}
                      maxLength={Math.max(details.description.length, 1000)}
                      onChange={event => onChange('productDetails', combineItemDetails(event.target.value, details.specifications))}
                      placeholder="e.g. 4-door wardrobe with loft" />
                  </div>}
                  </div>
                  <ItemSpecifications value={item.productDetails} onChange={value => onChange('productDetails', value)} />
                  <div className="border-t border-border/70 pt-4">
                    <ItemMeasurements layout="product" item={item} onChange={(field, value) => onChange(field, value)} />
                  </div>
                  <div className={`grid items-end gap-3 [&_label]:block [&_label]:border-b [&_label]:border-border/60 [&_label]:pb-2 ${showSideColumn ? 'grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_7rem]' : 'grid-cols-1'}`}>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`item-rate-${fieldId}`}>Rate / {getQuotationUnit(item.measurementUnit)} ({currencySymbol})</Label>
                      <Input id={`item-rate-${fieldId}`} type="number" min="0" value={item.ratePerSft || ''} onChange={event => {
                        const rate = parseFloat(event.target.value) || 0;
                        onChange('ratePerSft', rate);
                        if (event.target.value !== '') onRemember?.({ ...item, ratePerSft: rate }, selectedId.current);
                      }} placeholder="0" step="0.01" />
                    </div>
                    {showSideColumn && <ItemSideSelector id={`item-side-${fieldId}`} value={item.side} onChange={value => onChange('side', value)} />}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
                    <span className="text-sm font-medium">Amount</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{pending ? 'Pending' : <>{currencySymbol}{item.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}</>}</span>
                  </div>
  </div>;
}
