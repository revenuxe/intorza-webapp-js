'use client';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bulkPreview, units, type Product, type Category, type BulkAction } from '@/lib/library/model';

export function ProductLibraryBulk({ products, categories, onApply, onClose }: { products: Product[]; categories: Category[]; onApply: (products: Product[], reset: boolean) => void; onClose: () => void }) {
  const [action, setAction] = useState<BulkAction>('rate');
  const [value, setValue] = useState('');
  const [base, setBase] = useState('');
  const [error, setError] = useState('');
  const preview = useMemo(() => { try { return { rows: bulkPreview(products, action, value, base), error: '' }; } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : 'Invalid values.' }; } }, [products, action, value, base]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="flex max-h-[90dvh] max-w-xl flex-col overflow-hidden rounded-2xl"><DialogHeader><DialogTitle>Bulk edit {products.length} selected products</DialogTitle><DialogDescription>Review every change below before applying. Unselected products stay unchanged.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-4 overflow-y-auto"><div className="space-y-1"><Label htmlFor="library-bulk-action">Action</Label><select id="library-bulk-action" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" value={action} onChange={event => { const next = event.target.value as BulkAction; setAction(next); setValue(next === 'unit' ? 'Sq.ft' : next === 'category' ? categories[0]?.id || '' : ''); }}>
      <option value="rate">Change rate</option><option value="increase">Increase rate by percentage</option><option value="decrease">Decrease rate by percentage</option><option value="unit">Change unit</option><option value="category">Move category</option><option value="hide">Hide selected products</option><option value="reset">Reset default products</option>
    </select></div>
    {!['hide', 'reset'].includes(action) && <div className="space-y-1"><Label htmlFor="library-bulk-value">{action === 'unit' ? 'Unit' : action === 'category' ? 'Category' : action === 'rate' ? 'New rate (INR)' : 'Percentage'}</Label>{action === 'unit' || action === 'category' ? <select id="library-bulk-value" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" value={value} onChange={event => setValue(event.target.value)}>{action === 'unit' ? units.map(unit => <option key={unit}>{unit}</option>) : categories.filter(row => !row.hidden).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select> : <Input id="library-bulk-value" inputMode="decimal" value={value} placeholder={action === 'rate' ? 'Leave blank to clear rate' : 'e.g. 5'} onChange={event => setValue(event.target.value)} />}</div>}
    {['increase', 'decrease'].includes(action) && <div className="space-y-1"><Label htmlFor="library-bulk-base">Base rate for products without a rate (optional)</Label><Input id="library-bulk-base" inputMode="decimal" value={base} onChange={event => setBase(event.target.value)} placeholder="Required if selection includes unset rates" /></div>}
    <div className="rounded-xl border"><p className="border-b p-3 text-sm font-semibold">Preview changes</p><div className="max-h-56 overflow-y-auto divide-y">{preview.rows.map((row, index) => <div key={row.id} className="flex items-start justify-between gap-3 p-3 text-xs"><span className="min-w-0 break-words">{row.name}</span><span className="shrink-0 text-right">{action === 'hide' ? 'Hidden' : action === 'reset' ? 'Restore defaults' : action === 'category' ? categories.find(category => category.id === row.categoryId)?.name : action === 'unit' ? products[index].unit + ' → ' + row.unit : (products[index].rate ?? 'Not set') + ' → ' + (row.rate ?? 'Not set')}</span></div>)}</div></div>
    {(preview.error || error) && <p role="alert" className="text-sm text-destructive">{preview.error || error}</p>}</div>
    <DialogFooter className="gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!!preview.error || !preview.rows.length} onClick={() => { try { onApply(preview.rows, action === 'reset'); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save.'); } }}>Apply {products.length} changes</Button></DialogFooter>
  </DialogContent></Dialog>;
}
