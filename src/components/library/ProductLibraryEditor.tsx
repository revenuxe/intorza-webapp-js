'use client';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ItemSpecifications } from '@/components/quotation/ItemSpecifications';
import { combineItemDetails, splitItemDetails } from '@/lib/itemSpecifications';
import { parseRate, units, validateProduct, type Product, type Category } from '@/lib/library/model';

export function ProductLibraryEditor({ initial, categories, onClose, onSave }: { initial: Product; categories: Category[]; onClose: () => void; onSave: (product: Product) => void }) {
  const [product, setProduct] = useState(initial);
  const [rate, setRate] = useState(initial.rate === null ? '' : String(initial.rate));
  const [error, setError] = useState('');
  const save = () => {
    try { onSave(validateProduct({ ...product, rate: parseRate(rate), updatedAt: new Date().toISOString() })); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save product.'); }
  };
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent side="bottom" className="mx-auto flex max-h-[92dvh] max-w-2xl flex-col overflow-hidden rounded-t-2xl p-0">
    <SheetHeader className="border-b px-5 py-4 pr-12"><SheetTitle>{initial.updatedAt || initial.master ? 'Edit product' : 'Add product'}</SheetTitle><SheetDescription>Only your library changes. Leave the rate blank when it is not set.</SheetDescription></SheetHeader>
    <form id="library-product-form" className="min-h-0 space-y-4 overflow-y-auto p-5" onSubmit={event => { event.preventDefault(); save(); }}>
      <div className="space-y-1.5"><Label htmlFor="library-product-name">Product name *</Label><Input id="library-product-name" required maxLength={160} value={product.name} onChange={event => setProduct({ ...product, name: event.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="library-product-category">Category *</Label><select id="library-product-category" required className="h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" value={product.categoryId} onChange={event => setProduct({ ...product, categoryId: event.target.value })}>{categories.filter(row => !row.hidden || row.id === product.categoryId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="library-product-unit">Unit *</Label><select id="library-product-unit" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" value={product.unit} onChange={event => setProduct({ ...product, unit: event.target.value })}>{units.map(unit => <option key={unit}>{unit}</option>)}</select></div><div className="space-y-1.5"><Label htmlFor="library-product-rate">Rate (INR)</Label><Input id="library-product-rate" inputMode="decimal" placeholder="Not set" value={rate} onChange={event => setRate(event.target.value)} /></div></div>
      <div className="space-y-1.5"><Label htmlFor="library-product-description">Description</Label><Textarea id="library-product-description" maxLength={5000} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} /></div>
      <ItemSpecifications value={combineItemDetails(product.description, product.specifications)} onChange={value => { const parsed = splitItemDetails(value); setProduct({ ...product, specifications: parsed.specifications }); }} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
    <div className="flex shrink-0 gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button variant="outline" className="h-11 flex-1" onClick={onClose}>Cancel</Button><Button type="submit" form="library-product-form" className="h-11 flex-1">Save product</Button></div>
  </SheetContent></Sheet>;
}
