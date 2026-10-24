'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { itemCalculation } from '@/lib/quotation-ai/domain';
import type { Estimate } from '@/lib/quotation-ai/floor-plan';
import { SQFT_PER_SQM, workAreaSqft, type MeasurementInputUnit } from '@/lib/quotation-ai/measurement-units';

export function CompleteEstimate({ estimate, disabled, onComplete, onRetry, inputUnit = 'sqft' }: {
  estimate: Estimate; disabled: boolean;
  onComplete: (change: { itemId: string; widthFt: number | null; heightFt: number | null; areaSqft?: number | null; ratePerSft: number | null }) => Promise<void>;
  onRetry: () => void;
  inputUnit?: MeasurementInputUnit;
}) {
  const items = estimate.draft.sections.flatMap(section => section.items).filter(item => !/Billing: (piece|lump_sum); price separately/i.test(item.productDetails));
  const missing = items.filter(item => itemCalculation(item).area == null || item.ratePerSft == null);
  const [activeId, setActiveId] = useState('');
  const item = items.find(row => row.id === activeId) ?? missing[0] ?? items[0];
  const [unit, setUnit] = useState(inputUnit);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [area, setArea] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const metric = unit === 'sqm' || unit === 'metres';
  const lengthLabel = metric ? 'm' : 'ft';
  const areaLabel = metric ? 'sq m' : 'sq ft';
  useEffect(() => {
    setUnit(inputUnit);
    const metricUnit = inputUnit === 'sqm' || inputUnit === 'metres';
    const format = (value: number | null | undefined) => value == null ? '' : String(Number(value.toFixed(6)));
    const lengthFactor = metricUnit ? 0.3048 : 1;
    setWidth(format(item?.widthFt == null ? null : item.widthFt * lengthFactor));
    setHeight(format(item?.heightFt == null ? null : item.heightFt * lengthFactor));
    const coverage = item ? itemCalculation(item).area : null;
    setArea(format(coverage == null ? null : coverage / (metricUnit ? SQFT_PER_SQM : 1)));
    setRate(item?.ratePerSft?.toString() ?? ''); setError('');
  }, [item, inputUnit]);
  if (!item) return null;
  const pricesPending = items.filter(row => row.ratePerSft == null).length;
  const areasPending = items.filter(row => itemCalculation(row).area == null).length;
  const updateDimensions = (nextWidth: string, nextHeight: string) => {
    setWidth(nextWidth); setHeight(nextHeight);
    const product = Number(nextWidth) * Number(nextHeight);
    setArea(nextWidth && nextHeight && Number.isFinite(product) && product > 0 ? String(Number(product.toFixed(6))) : '');
  };
  const changeUnit = (next: MeasurementInputUnit) => {
    const nextMetric = next === 'sqm' || next === 'metres';
    if (metric !== nextMetric) {
      const lengthFactor = nextMetric ? 0.3048 : 1 / 0.3048;
      const areaFactor = nextMetric ? 1 / SQFT_PER_SQM : SQFT_PER_SQM;
      const convert = (value: string, factor: number) => value === '' ? '' : String(Number((Number(value) * factor).toFixed(6)));
      setWidth(convert(width, lengthFactor)); setHeight(convert(height, lengthFactor)); setArea(convert(area, areaFactor));
    }
    setUnit(next); setError('');
  };
  const submit = async () => {
    try {
      setError('');
      const hasDimensions = width !== '' || height !== '';
      let widthFt: number | null = null, heightFt: number | null = null, areaSqft: number | null = null;
      if (hasDimensions) {
        workAreaSqft(metric ? 'metres' : 'feet', Number(width), Number(height));
        const factor = metric ? 1 / 0.3048 : 1;
        widthFt = Math.round(Number(width) * factor * 10000) / 10000;
        heightFt = Math.round(Number(height) * factor * 10000) / 10000;
        if (widthFt <= 0 || heightFt <= 0) throw new Error('Enter positive width and height.');
      } else if (area !== '') areaSqft = workAreaSqft(metric ? 'sqm' : 'sqft', Number(area));
      await onComplete({ itemId: item.id, widthFt, heightFt, areaSqft, ratePerSft: rate !== '' ? Number(rate) : null });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the measurements.'); }
  };
  return <details className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20" open={missing.length > 0}>
    <summary className="cursor-pointer text-sm font-semibold">{missing.length ? 'Finish your estimate' : 'Edit measurements and rates'} <span className="font-normal text-muted-foreground">- {items.length - pricesPending} priced, {pricesPending} price pending, {areasPending} measurement pending</span></summary>
    <div className="mt-3 space-y-3">
      {missing.length > 0 && <><p className="text-xs leading-5 text-muted-foreground">The total already includes auto-filled items. Let AI estimate the remaining rates and work dimensions automatically. All estimates stay editable.</p><Button type="button" disabled={disabled} onClick={onRetry}>Estimate remaining items with AI</Button></>}
      <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Enter a known correction manually (optional)</summary><div className="mt-3 space-y-3">
        <select aria-label="Item to complete" value={item.id} disabled={disabled} onChange={event => setActiveId(event.target.value)} className="h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm">{items.map(row => <option key={row.id} value={row.id}>{row.productName}</option>)}</select>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <div className="grid grid-cols-2 items-start gap-3">
            <label className="space-y-2 text-sm"><span>Measurement</span><select aria-label="Measurement unit" value={unit} disabled={disabled} onChange={event => changeUnit(event.target.value as MeasurementInputUnit)} className="h-10 w-full rounded-lg border border-primary/20 bg-primary/5 px-3 text-sm text-primary"><option value="sqft">Sq.ft</option><option value="feet">Feet</option><option value="sqm">Sq.m</option><option value="metres">Metres</option></select></label>
            <label className="space-y-2 text-sm"><span>Area ({areaLabel})</span><Input aria-label={`Area (${areaLabel})`} type="number" min="0.0001" step="any" value={area} disabled={disabled} onChange={event => { setArea(event.target.value); setWidth(''); setHeight(''); }} /></label>
            <label className="space-y-2 text-sm"><span>Width ({lengthLabel})</span><Input aria-label={`Width (${lengthLabel})`} type="number" min="0.0001" max="100000" step="any" value={width} disabled={disabled} onChange={event => updateDimensions(event.target.value, height)} /></label>
            <label className="space-y-2 text-sm"><span>Height ({lengthLabel})</span><Input aria-label={`Height (${lengthLabel})`} type="number" min="0.0001" max="100000" step="any" value={height} disabled={disabled} onChange={event => updateDimensions(width, event.target.value)} /></label>
            <p className="col-span-2 text-xs leading-5 text-muted-foreground">Enter width and height to calculate area, or enter the area directly. Use work-face coverage for cabinets and walls. Measurements convert to sqft for pricing.</p>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="space-y-1"><Label htmlFor="complete-rate" className="text-xs">Known selling rate per sqft (optional)</Label><Input id="complete-rate" type="number" min="0" max="10000000" step="any" value={rate} disabled={disabled} placeholder="Enter only if you know the rate" onChange={event => setRate(event.target.value)} /><p className="text-[11px] text-muted-foreground">This is a rate, not your project budget. Tax is calculated using your quotation settings. The rate stays per sqft for every input unit.</p></div>
          <Button type="submit" size="sm" disabled={disabled || (!area && !width && !height && rate === '')}>Apply details</Button>
        </form>
      </div></details>
    </div>
  </details>;
}
