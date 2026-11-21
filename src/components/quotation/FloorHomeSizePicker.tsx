'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { floorHomeOptions } from '@/lib/projectTypeDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function FloorHomeSizePicker({ floors, values, previousSize, onChange }: {
  floors: string[]; values: Record<string, string>; previousSize: string; onChange: (values: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [activeFloor, setActiveFloor] = useState(floors[0]);
  const currentFloor = floors.includes(activeFloor) ? activeFloor : floors[0];
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const selected = floors.filter(floor => values[floor]);
  const summary = selected.map(floor => `${floor === 'Ground Floor' ? 'G' : floors.indexOf(floor)}: ${values[floor]}`).join(' · ');
  const trigger = <Button id="projectBhk" type="button" variant="outline" aria-haspopup="dialog" aria-expanded={open} aria-label="BHK / Home Size"
    className="h-auto min-h-12 w-full justify-between gap-2 rounded-xl px-2 py-3 text-sm font-normal sm:px-3">
    <span className="min-w-0 text-left"><span className="block truncate" title={summary}>{summary || 'Select BHK by floor'}</span>
      {selected.length > 0 && selected.length < floors.length && <span className="block text-xs text-muted-foreground">{selected.length} of {floors.length} floors set</span>}
    </span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </Button>;
  const content = <>
    <Tabs value={currentFloor} onValueChange={setActiveFloor} className="flex min-h-0 flex-1 flex-col">
      <div className="min-w-0 shrink-0 px-4 pt-3">
        <div className="overflow-x-auto overscroll-x-contain pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--primary) / 0.45) hsl(var(--muted))' }}>
        <TabsList aria-label="Choose floor" className="inline-flex h-auto min-w-full justify-start gap-2 rounded-xl border border-border bg-muted/40 p-2">
          {floors.map((floor, index) => <TabsTrigger key={floor} value={floor} aria-label={floor} className="min-h-11 shrink-0 gap-1 rounded-lg border border-border bg-background px-4 text-foreground shadow-none hover:border-primary/50 hover:bg-primary/5 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
            onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })}>
            {index === 0 ? 'G' : `${index}${index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th'} Floor`}
            {values[floor] && <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
          </TabsTrigger>)}
        </TabsList>
        </div>
      </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--primary) / 0.45) hsl(var(--muted))' }}>
      {previousSize && !selected.length && <p className="text-sm text-muted-foreground">Previous home size: {previousSize}. Choose which layout belongs to each floor.</p>}
      {floors.map(floor => <TabsContent key={floor} value={floor} className="mt-3 rounded-xl border border-border bg-background p-3">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{floor}</h3>
          {values[floor] && <button type="button" className="text-sm text-muted-foreground underline" onClick={() => { const next = { ...values }; delete next[floor]; onChange(next); }}>Clear<span className="sr-only"> {floor}</span></button>}
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={`${floor} home size`}>
          {floorHomeOptions.map(size => <Button key={size} type="button" variant="outline" aria-pressed={values[floor] === size}
            className={`relative h-auto min-h-16 whitespace-normal break-words rounded-lg border px-2 py-3 text-center text-sm font-normal leading-snug transition-colors ${size === 'Parking / No residence' ? 'col-span-3 min-h-12 whitespace-nowrap' : ''} ${values[floor] === size ? 'border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground'}`}
            onClick={() => onChange({ ...values, [floor]: size })}><span>{size}</span>{values[floor] === size && <Check className="absolute right-1 top-1 !h-3 !w-3 text-primary" aria-hidden="true" />}</Button>)}
        </div>
      </TabsContent>)}
    </div>
    </Tabs>
    <div className="shrink-0 border-t p-4"><Button type="button" className="w-full" onClick={() => setOpen(false)}>Done{selected.length ? ` · ${selected.length}/${floors.length} floors set` : ''}</Button></div>
  </>;
  if (mobile) return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild>{trigger}</SheetTrigger>
    <SheetContent side="bottom" className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
      <SheetHeader className="shrink-0 border-b p-4 pr-12 text-left"><SheetTitle>BHK by floor</SheetTitle><SheetDescription>Choose a home layout for each floor. Selections save as you choose.</SheetDescription></SheetHeader>{content}
    </SheetContent></Sheet>;
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent role="dialog" aria-label="BHK by floor" align="end" collisionPadding={16} className="flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl p-0">
      <div className="shrink-0 border-b p-4"><h2 className="font-semibold">BHK by floor</h2><p className="mt-1 text-sm text-muted-foreground">Choose a home layout for each floor.</p></div>{content}
    </PopoverContent></Popover>;
}
