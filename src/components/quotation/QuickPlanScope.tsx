'use client';
import { BedDouble, Check, ChevronDown, CookingPot, Grid2X2, House, Layers3, MapPin, ScanLine, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { scopedRooms, type PlanAnalysis, type ProjectBrief } from '@/lib/quotation-ai/floor-plan';
import { FloorPlanDesignBrief } from './FloorPlanDesignBrief';

export function QuickPlanScope({ analysis, brief, onChange, onRoomChange }: { analysis: PlanAnalysis; brief: ProjectBrief; onChange: (brief: ProjectBrief) => void; onRoomChange: (index: number, values: Partial<PlanAnalysis['rooms'][number]>) => void }) {
  const names = analysis.rooms.map(room => room.name);
  const included = scopedRooms(analysis, brief);
  const hasKitchen = included.some(room => room.kind === 'kitchen');
  const choices = [
    { value: 'complete', name: 'Full interior', detail: 'Every room. One cohesive quotation.', icon: House },
    { value: 'kitchen', name: 'Kitchen', detail: 'Cabinetry, counters and finishes.', icon: CookingPot },
    { value: 'bedrooms', name: 'Bedrooms', detail: 'Wardrobes, storage and finishes.', icon: BedDouble },
    { value: 'kitchen-wardrobes', name: 'Kitchen + wardrobes', detail: 'The most common core-interior package.', icon: Layers3 },
    { value: 'living-bedrooms', name: 'Living + bedrooms', detail: 'TV feature and bedroom storage.', icon: BedDouble },
    { value: 'selected', name: 'Select rooms', detail: 'Focus on the spaces you choose.', icon: Grid2X2 },
  ] as const;
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/5" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-background shadow-sm"><ScanLine className="h-5 w-5 text-primary" strokeWidth={1.5} /></div>
        <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"><Check className="h-3 w-3" />Analysis complete</p><h3 className="mt-1 text-lg font-semibold tracking-tight">Your plan, ready to take shape.</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the scope. We’ll prepare your first quotation.</p></div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 divide-x rounded-xl border bg-background/80 py-3">
        <div className="px-3"><p className="text-lg font-semibold tabular-nums">{analysis.rooms.length}</p><p className="text-[10px] text-muted-foreground">rooms detected</p></div>
        <div className="min-w-0 px-3"><p className="truncate text-sm font-semibold" title={analysis.propertyType}>{analysis.propertyType}</p><p className="mt-1 text-[10px] text-muted-foreground">property type</p></div>
        <div className="px-3"><p className="text-lg font-semibold tabular-nums">{analysis.floors ?? '—'}</p><p className="text-[10px] text-muted-foreground">{analysis.floors === 1 ? 'floor' : 'floors'}</p></div>
      </div>
      <details className="relative mt-3 rounded-xl border bg-background/80 p-3" open={analysis.rooms.length <= 6}>
        <summary className="cursor-pointer text-xs font-semibold">Review detected rooms <span className="font-normal text-muted-foreground">· {analysis.rooms.length}</span></summary>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Check room names and sizes before choosing the quotation scope. Unclear dimensions stay pending.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{analysis.rooms.map((room, index) => <div key={`${room.name}-${index}`} className="min-w-0 rounded-lg bg-muted/40 p-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.7fr)] gap-2">
            <label className="min-w-0 space-y-1 text-[10px] text-muted-foreground">Room name<Input aria-label={`Detected room ${index + 1} name`} value={room.name} maxLength={150} className="h-9 bg-background text-xs text-foreground" onChange={event => onRoomChange(index, { name: event.target.value })} /></label>
            <label className="min-w-0 space-y-1 text-[10px] text-muted-foreground">Room type<select aria-label={`Detected room ${index + 1} type`} value={room.kind} className="h-9 w-full rounded-md border bg-background px-2 text-xs text-foreground" onChange={event => onRoomChange(index, { kind: event.target.value as typeof room.kind })}>{['bedroom','bathroom','kitchen','living','dining','balcony','utility','study','other'].map(kind => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">{(['widthFt', 'lengthFt'] as const).map((field, dimensionIndex) => <label key={field} className="space-y-1 text-[10px] text-muted-foreground">{dimensionIndex ? 'Length (ft)' : 'Width (ft)'}<Input aria-label={`${room.name} ${dimensionIndex ? 'length' : 'width'} in feet`} type="number" min="0.01" max="100000" step="any" value={room[field] ?? ''} placeholder="Unknown" className="h-9 bg-background text-xs text-foreground" onChange={event => onRoomChange(index, { [field]: event.target.value ? Number(event.target.value) : null, source: 'user', confidence: 'high' })} /></label>)}</div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">{room.source === 'user' ? 'Edited by you' : room.source === 'printed' ? 'Printed on plan' : 'Unconfirmed'} · {room.confidence} confidence{room.file ? ` · ${room.file}, page ${room.page}` : ''}</p>
        </div>)}</div>
      </details>
    </section>
    <fieldset><legend className="text-sm font-semibold">What are we designing?</legend><p className="mb-3 mt-1 text-xs text-muted-foreground">The whole home, or just your favourite spaces.</p>
      <div className="grid grid-cols-2 gap-2.5">{choices.filter(choice => choice.value === 'selected' || scopedRooms(analysis, { scope: choice.value, roomNames: names }).length).map(choice => {
        const active = brief.scope === choice.value;
        return <button type="button" key={choice.value} aria-label={choice.name} aria-pressed={active} className={`relative min-w-0 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-4 ${active ? 'border-primary bg-primary/[0.045] ring-1 ring-primary/20' : 'bg-card hover:border-primary/35 hover:bg-muted/30'}`} onClick={() => onChange({ ...brief, scope: choice.value, roomNames: names, roomWork: undefined })}>
          <div className="mb-3 flex items-center justify-between"><choice.icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={1.5} /><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>{active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span></div>
          <span className="block text-sm font-semibold">{choice.name}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{choice.detail}</span>
        </button>;
      })}</div>
    </fieldset>
    {hasKitchen && <details className="group/kitchen rounded-xl border bg-card p-3.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"><span>Modular kitchen preferences <span className="font-normal text-muted-foreground">· optional</span></span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/kitchen:rotate-180" aria-hidden="true" /></summary>
      <fieldset className="mt-3 space-y-3"><legend className="sr-only">Modular kitchen preferences</legend><p className="text-xs leading-5 text-muted-foreground">Help the estimate choose a suitable kitchen design. Select “Not sure” to let the AI leave this open; confirm measurements and clearances on site.</p>
      <div className="grid grid-cols-2 gap-2">{([
        ['layout','Layout',[['unknown','Not sure'],['straight','Straight'],['l_shape','L-shaped'],['u_shape','U-shaped'],['parallel','Parallel'],['island','Island / peninsula']]],
        ['carcass','Carcass',[['unknown','Not sure'],['bwr_plywood','BWR plywood'],['marine_plywood','Marine plywood'],['hdhmr','HDHMR']]],
        ['shutter','Shutter finish',[['unknown','Not sure'],['laminate','Laminate'],['acrylic','Acrylic'],['membrane','Membrane'],['pu','PU paint'],['veneer','Veneer']]],
        ['hardware','Hardware',[['unknown','Not sure'],['standard','Standard'],['soft_close','Soft-close'],['premium_branded','Premium branded']]],
        ['countertop','Countertop',[['unknown','Not sure'],['granite','Granite'],['quartz','Quartz'],['solid_surface','Solid surface']]],
      ] as const).map(([key,label,choices]) => <label key={key} className="space-y-1 text-xs">{label}<select aria-label={`Kitchen ${label.toLowerCase()}`} value={brief.kitchenPreferences?.[key] ?? 'unknown'} className="h-10 w-full rounded-md border bg-background px-2 text-sm" onChange={event => onChange({ ...brief, kitchenPreferences: { ...brief.kitchenPreferences, [key]: event.target.value } })}>{choices.map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select></label>)}</div>
      <label className="block space-y-1 text-xs">Appliances, sink, hob or chimney details<Input aria-label="Kitchen appliance details" value={brief.kitchenPreferences?.appliances ?? ''} maxLength={600} placeholder="e.g. keep sink and hob positions; chimney above hob" onChange={event => onChange({ ...brief, kitchenPreferences: { ...brief.kitchenPreferences, appliances: event.target.value } })} /></label>
      </fieldset>
    </details>}
    <fieldset className="rounded-xl border bg-card p-3.5">
      <legend className="px-1 text-sm font-semibold">Material & finish level</legend>
      <p className="mb-3 text-xs leading-5 text-muted-foreground">Choose the quality level for your quotation. AI uses this to guide material specifications, hardware, finishes and comparable pricing.</p>
      <div className="grid grid-cols-2 gap-2.5">{([
        { value: 'Basic', detail: 'Practical materials and simple, durable finishes.' },
        { value: 'Standard', detail: 'Balanced everyday materials, hardware and finishes.' },
        { value: 'Premium', detail: 'Upgraded materials, hardware and refined finishes.' },
        { value: 'Luxury', detail: 'Top-grade options and custom detailing.' },
      ] as const).map(option => <button key={option.value} type="button" aria-label={`${option.value} finish`} aria-pressed={brief.finish === option.value} onClick={() => onChange({ ...brief, finish: option.value })} className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${brief.finish === option.value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/35'}`}>
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">{option.value}{brief.finish === option.value && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}</span>
        <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{option.detail}</span>
      </button>)}</div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Selected: {brief.finish}. Prices depend on the chosen specifications and available rates; review the estimate before sharing.</p>
    </fieldset>
    <FloorPlanDesignBrief brief={brief} onChange={onChange} />
    <fieldset className="rounded-xl border bg-card p-3.5"><legend className="px-1 text-sm font-semibold">Which units would you like to enter?</legend><div className="mt-1 grid grid-cols-2 gap-2">{([{ value: 'sqft', label: 'Sqft', detail: 'Direct area' }, { value: 'feet', label: 'Feet', detail: 'Width × height' }, { value: 'sqm', label: 'Square metres', detail: 'Direct area' }, { value: 'metres', label: 'Metres', detail: 'Width × height' }] as const).map(unit => <label key={unit.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${brief.measurementInputUnit === unit.value ? 'border-primary bg-primary/5' : ''}`}><input type="radio" name="measurement-input-unit" checked={brief.measurementInputUnit === unit.value} onChange={() => onChange({ ...brief, measurementInputUnit: unit.value })} /><span><span className="block font-medium">{unit.label}</span><span className="text-[10px] text-muted-foreground">{unit.detail}</span></span></label>)}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Drawing units are read from the plan. Your selection controls manual measurements; all work areas and prices are calculated in sqft. Feet/metres need two dimensions, not a single length.</p></fieldset>
    {brief.scope === 'selected' && <fieldset className="space-y-2"><legend className="mb-2 text-xs font-medium">Rooms to include</legend><div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2">{analysis.rooms.map(room => <label key={room.name} className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs ${brief.roomNames.includes(room.name) ? 'border-primary/30 bg-primary/5' : ''}`}><input type="checkbox" className="accent-primary" checked={brief.roomNames.includes(room.name)} onChange={event => onChange({ ...brief, roomNames: event.target.checked ? [...brief.roomNames, room.name] : brief.roomNames.filter(name => name !== room.name) })} /><span className="truncate" title={room.name}>{room.name}</span></label>)}</div></fieldset>}
    <div className="rounded-xl border bg-card">
      <details className="group p-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium"><span>{included.length} rooms included <span className="ml-2 font-normal text-muted-foreground">View plan</span></span><ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="mt-3 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">{included.map(room => <div key={room.name} className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs"><span className="min-w-0 break-words">{room.name}</span><span className="shrink-0 text-[10px] text-muted-foreground">{room.widthFt && room.lengthFt ? `${room.widthFt} × ${room.lengthFt} ft` : 'Size pending'}</span></div>)}</div></details>
      <div className="border-t p-3.5"><label className="block space-y-2 text-xs font-medium"><span className="flex flex-wrap items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Project city<span className="font-normal text-muted-foreground">Optional · improves local prices</span></span><Input value={brief.location === 'Unknown' ? '' : brief.location} maxLength={150} placeholder="e.g. Bengaluru" className="h-10 bg-muted/20 text-sm" onChange={event => onChange({ ...brief, location: event.target.value })} /></label></div>
    </div>
    <div className="flex items-start gap-2.5 px-1"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Room-by-room work, reference-based prices and clear assumptions. <span className="text-foreground">Everything stays editable.</span> We automatically use feet and sqft for this builder, including plans drawn in metres. Missing sizes and unsupported prices are marked for review.</p></div>
  </div>;
}
