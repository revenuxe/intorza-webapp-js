'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { itemCalculation } from '@/lib/quotation-ai/domain';
import type { Estimate } from '@/lib/quotation-ai/floor-plan';
import { workAreaSqft, type MeasurementInputUnit } from '@/lib/quotation-ai/measurement-units';

export function CompleteEstimate({ estimate, disabled, onComplete, onRetry, inputUnit = 'sqft' }: {
  estimate: Estimate; disabled: boolean;
  onComplete: (change: { itemId: string; widthFt: number | null; heightFt: number | null; areaSqft?: number | null; ratePerSft: number | null }) => Promise<void>;
  onRetry: () => void;
  inputUnit?: MeasurementInputUnit;
}) {
  const missing = estimate.draft.sections.flatMap(section => section.items).filter(item => !/Billing: (piece|lump_sum); price separately/i.test(item.productDetails) && (itemCalculation(item).area == null || item.ratePerSft == null));
  const [activeId, setActiveId] = useState('');
  const item = missing.find(row => row.id === activeId) ?? missing[0];
  const [area, setArea] = useState(''); const [rate, setRate] = useState('');
  const [second, setSecond] = useState(''); const [error, setError] = useState('');
  useEffect(() => { setArea(''); setSecond(''); setError(''); setRate(item?.ratePerSft?.toString() ?? ''); }, [item?.id, item?.ratePerSft, inputUnit]);
  if (!item) return null;
  const missingArea = itemCalculation(item).area == null;
  const items = estimate.draft.sections.flatMap(section => section.items).filter(row => !/Billing: (piece|lump_sum); price separately/i.test(row.productDetails));
  const pricesPending = items.filter(row => row.ratePerSft == null).length;
  const areasPending = items.filter(row => itemCalculation(row).area == null).length;
  const dimensions = inputUnit === 'feet' || inputUnit === 'metres';
  return <details className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20" open={areasPending > 0}>
    <summary className="cursor-pointer text-sm font-semibold">Review estimate gaps <span className="font-normal text-muted-foreground">· {items.length - pricesPending} priced, {pricesPending} price pending, {areasPending} measurement pending</span></summary>
    <div className="mt-3 space-y-3">
    <p className="text-xs leading-5 text-muted-foreground">The total already includes auto-filled items. This review is optional: enter only a missing work measurement, or retry pricing. Provisional prices remain editable in the quotation.</p>
    <select aria-label="Item to complete" value={item.id} disabled={disabled} onChange={event => setActiveId(event.target.value)} className="h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm">{missing.map(row => <option key={row.id} value={row.id}>{row.productName}</option>)}</select>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); try { setError(''); const coverage = missingArea && area ? workAreaSqft(inputUnit, Number(area), second ? Number(second) : undefined) : null; const useDimensions = coverage != null && dimensions; const feetPerUnit = inputUnit === 'metres' ? 1 / 0.3048 : 1; void onComplete({ itemId: item.id, widthFt: useDimensions ? Math.round(Number(area) * feetPerUnit * 10000) / 10000 : null, heightFt: useDimensions ? Math.round(Number(second) * feetPerUnit * 10000) / 10000 : null, areaSqft: useDimensions ? null : coverage, ratePerSft: item.ratePerSft == null && rate !== '' ? Number(rate) : null }); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the measurements.'); } }}>
      {missingArea && <div className="space-y-2"><Label htmlFor="complete-area" className="text-xs">{dimensions ? `Work width / length (${inputUnit})` : `Work area (${inputUnit})`}</Label><Input id="complete-area" type="number" min="0.0001" max="100000" step="any" value={area} disabled={disabled} placeholder="Enter known work coverage" onChange={event => setArea(event.target.value)} />{dimensions && <><Label htmlFor="complete-second" className="text-xs">Work height / depth ({inputUnit})</Label><Input id="complete-second" type="number" min="0.0001" step="any" value={second} disabled={disabled} required={area !== ''} onChange={event => setSecond(event.target.value)} /></>}<p className="text-xs leading-5 text-muted-foreground">Converted to sqft before calculating the amount. For cabinets and wall work, enter work-face coverage, not room floor area.</p></div>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {item.ratePerSft == null && <div className="space-y-1"><Label htmlFor="complete-rate" className="text-xs">Known selling rate per sqft (optional)</Label><Input id="complete-rate" type="number" min="0" max="10000000" value={rate} disabled={disabled} placeholder="Enter only if you know the rate" onChange={event => setRate(event.target.value)} /><p className="text-[11px] text-muted-foreground">This is a rate, not your project budget. Tax is calculated using your quotation settings.</p></div>}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={disabled || (!area && rate === '')}>Apply details</Button>{missing.some(row => row.ratePerSft == null) && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onRetry}>Retry pricing only</Button>}</div>
    </form>
    </div>
  </details>;
}
