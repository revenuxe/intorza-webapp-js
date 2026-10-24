'use client';
import { useId, type ComponentProps } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AutoGrowTextarea } from '@/components/ui/auto-grow-textarea';
import { ProductNameInput } from './ProductNameInput';
import { ItemMeasurements } from './ItemMeasurements';
import { ItemSpecifications } from './ItemSpecifications';
import { ItemSideSelector } from './ItemSideSelector';
import { combineItemDetails, splitItemDetails } from '@/lib/itemSpecifications';
import { getQuotationUnit } from '@/lib/quotationUnits';
export type ItemField = 'productName' | 'productDetails' | 'side' | 'measurementUnit' | 'widthFt' | 'heightFt' | 'sftArea' | 'ratePerSft';
export type EditableQuotationItem = { productName: string; productDetails: string; side: string; measurementUnit?: string; widthFt: number; heightFt: number; sftArea: number; ratePerSft: number; amount: number };
export function QuotationItemFields({ item, onChange, patterns = [], pending = false, currencySymbol = '\u20b9', locale = 'en-IN', showProductDetails = true, showSideColumn = true, compact = false, idPrefix }: {
  item: EditableQuotationItem; onChange: (field: ItemField, value: string | number) => void;
  patterns?: ComponentProps<typeof ProductNameInput>['patterns']; pending?: boolean;
  currencySymbol?: string; locale?: string; showProductDetails?: boolean; showSideColumn?: boolean; compact?: boolean; idPrefix?: string;
}) {
  const generatedId = useId();
  const fieldId = idPrefix ?? generatedId;
  const details = splitItemDetails(item.productDetails);
  return <>
                  <div className={`grid gap-4 ${showProductDetails && !compact ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : ''}`}>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor={`product-name-${fieldId}`}>Product Name</Label>
                    <ProductNameInput id={`product-name-${fieldId}`} value={item.productName}
                      onChange={name => onChange('productName', name)} patterns={patterns}
                      onProductSelect={pattern => {
                        if (pattern.product_details && !item.productDetails) onChange('productDetails', pattern.product_details);
                        if (pattern.preferred_rate && pattern.preferred_rate > 0 && !item.ratePerSft) onChange('ratePerSft', pattern.preferred_rate);
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
                  <div className={`grid items-end gap-3 ${showSideColumn ? 'grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_7rem]' : 'grid-cols-1'}`}>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`item-rate-${fieldId}`}>Rate / {getQuotationUnit(item.measurementUnit)} ({currencySymbol})</Label>
                      <Input id={`item-rate-${fieldId}`} type="number" min="0" value={item.ratePerSft || ''} onChange={event => onChange('ratePerSft', parseFloat(event.target.value) || 0)} placeholder="0" step="0.01" />
                    </div>
                    {showSideColumn && <ItemSideSelector id={`item-side-${fieldId}`} value={item.side} onChange={value => onChange('side', value)} />}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
                    <span className="text-sm font-medium">Amount</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{pending ? 'Pending' : <>{currencySymbol}{item.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}</>}</span>
                  </div>
  </>;
}
