'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { itemCalculation } from '@/lib/quotation-ai/domain';
import type { Estimate } from '@/lib/quotation-ai/floor-plan';

export function CompleteEstimate({ estimate, disabled, onComplete, onRetry }: {
  estimate: Estimate; disabled: boolean;
  onComplete: (change: { itemId: string; widthFt: number | null; heightFt: number | null; ratePerSft: number | null }) => Promise<void>;
  onRetry: () => void;
}) {
  const missing = estimate.draft.sections.flatMap(section => section.items).filter(item => itemCalculation(item).area == null || item.ratePerSft == null);
  const [activeId, setActiveId] = useState('');
  const item = missing.find(row => row.id === activeId) ?? missing[0];
  const [width, setWidth] = useState(''); const [height, setHeight] = useState(''); const [rate, setRate] = useState('');
  useEffect(() => { setWidth(item?.widthFt?.toString() ?? ''); setHeight(item?.heightFt?.toString() ?? ''); setRate(item?.ratePerSft?.toString() ?? ''); }, [item?.id, item?.widthFt, item?.heightFt, item?.ratePerSft]);
  if (!item) return null;
  const missingArea = itemCalculation(item).area == null;
  return <div className="min-w-0 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
    <div><h3 className="text-sm font-semibold">Let’s complete your estimate</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{missing.length} item{missing.length === 1 ? '' : 's'} need a size or price. Enter known details here, or retry the price search. No need to start again.</p></div>
    <select aria-label="Item to complete" value={item.id} disabled={disabled} onChange={event => setActiveId(event.target.value)} className="h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm">{missing.map(row => <option key={row.id} value={row.id}>{row.productName}</option>)}</select>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void onComplete({ itemId: item.id, widthFt: missingArea && width ? Number(width) : null, heightFt: missingArea && height ? Number(height) : null, ratePerSft: item.ratePerSft == null && rate !== '' ? Number(rate) : null }); }}>
      {missingArea && <><p className="text-xs leading-5">Measure the work face, not the room floor. For cabinets or wardrobes, enter the total front width and front height. Leave the depth out of this square-foot calculation.</p><div className="grid min-w-0 grid-cols-2 gap-2"><div className="min-w-0 space-y-1"><Label htmlFor="complete-width" className="text-xs">Front width / length (ft)</Label><Input id="complete-width" type="number" min="0.01" max="100000" required={height !== ''} value={width} disabled={disabled} placeholder="e.g. 8" onChange={event => setWidth(event.target.value)} /></div><div className="min-w-0 space-y-1"><Label htmlFor="complete-height" className="text-xs">Front height (ft)</Label><Input id="complete-height" type="number" min="0.01" max="100000" required={width !== ''} value={height} disabled={disabled} placeholder="Enter measured height" onChange={event => setHeight(event.target.value)} /></div></div></>}
      {item.ratePerSft == null && <div className="space-y-1"><Label htmlFor="complete-rate" className="text-xs">Known selling rate per sqft (optional)</Label><Input id="complete-rate" type="number" min="0" max="10000000" value={rate} disabled={disabled} placeholder="Enter only if you know the rate" onChange={event => setRate(event.target.value)} /><p className="text-[11px] text-muted-foreground">This is a rate, not your project budget. Tax is calculated using your quotation settings.</p></div>}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={disabled || (!width && !height && rate === '')}>Apply details</Button>{missing.some(row => row.ratePerSft == null) && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRetry}>Retry pricing only</Button>}</div>
    </form>
  </div>;
}
