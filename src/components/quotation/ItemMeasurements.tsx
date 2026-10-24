import { Input } from '@/components/ui/input';
import { quotationUnits, getQuotationUnit, isAreaUnit } from '@/lib/quotationUnits';
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export function ItemMeasurements({ item, onChange, layout = 'standard' }: {
 layout?: 'standard' | 'product';
 item: { measurementUnit?: string; widthFt: number; heightFt: number; sftArea: number };
 onChange: (field: 'measurementUnit' | 'widthFt' | 'heightFt' | 'sftArea', value: string | number) => void;
}) {
  const unit = getQuotationUnit(item.measurementUnit);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const area = isAreaUnit(unit);
  const calculated = area && item.widthFt > 0 && item.heightFt > 0 && Math.abs(item.widthFt * item.heightFt - item.sftArea) < 0.0001;
  const length = unit === 'Sq.m' ? 'm' : 'ft';
 const coverageField = (<label className={`space-y-2 text-sm ${layout === 'product' ? 'col-span-2' : ''}`}><span className="flex items-center justify-between gap-2"><span>{area ? 'Area' : 'Quantity'} ({unit})</span>{calculated && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Calculated</span>}</span><div className="relative"><Input className={calculated ? 'border-primary/20 bg-primary/5 pr-14 font-semibold text-primary' : 'pr-14'} aria-label={(area ? 'Area' : 'Quantity') + ' (' + unit + ')'} type="number" min="0" step="any" value={item.sftArea || ''} onChange={e => onChange('sftArea', Math.max(0, Number(e.target.value) || 0))} /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span></div>{calculated && <span className="block text-[11px] text-muted-foreground">Width x height. Edit area directly to replace dimensions.</span>}</label>);
 const dimensionFields = (area && (['widthFt', 'heightFt'] as const).map((field, index) => <label key={field} className="space-y-2 text-sm"><span>{index ? 'Height' : 'Width'} ({length})</span><Input aria-label={(index ? 'Height' : 'Width') + ' (' + length + ')'} type="number" min="0" step="any" value={item[field] || ''} onChange={e => onChange(field, Math.max(0, Number(e.target.value) || 0))} /></label>));
 return <div className="grid grid-cols-2 items-start gap-3">
 <div className={`space-y-2 text-sm ${layout === 'product' ? 'col-span-2' : ''}`}>
   <span className="block text-xs font-medium text-muted-foreground">Unit / Measurement</span>
   <Popover open={unitPickerOpen} onOpenChange={setUnitPickerOpen}>
     <PopoverTrigger asChild>
       <Button type="button" variant="outline" role="combobox" aria-label="Measurement unit" aria-expanded={unitPickerOpen} className="h-10 w-full justify-between gap-2 rounded-lg border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10 sm:text-sm">
         <span>{unit}</span>
         <ChevronDown className={`h-4 w-4 transition-transform ${unitPickerOpen ? 'rotate-180' : ''}`} />
       </Button>
     </PopoverTrigger>
     <PopoverContent align="start" className="w-[min(220px,calc(100vw-2rem))] overflow-hidden rounded-xl p-0 shadow-lg">
       <Command>
         <CommandInput placeholder="Search units..." />
         <CommandList className="max-h-60">
           <CommandEmpty>No units found.</CommandEmpty>
           <CommandGroup>
             {quotationUnits.map(([value, name]) => (
               <CommandItem key={value} value={value} keywords={[name]} onSelect={() => {
                 if (value !== unit) onChange('measurementUnit', value);
                 setUnitPickerOpen(false);
               }} className="gap-2 py-2">
                 <Check className={`h-4 w-4 shrink-0 ${unit === value ? 'opacity-100' : 'opacity-0'}`} />
                 <span>{value}</span>
               </CommandItem>
             ))}
           </CommandGroup>
         </CommandList>
       </Command>
     </PopoverContent>
   </Popover>
 </div>
 {layout === 'product' ? <>{dimensionFields}{coverageField}</> : <>{coverageField}{dimensionFields}</>}
 <p className="col-span-2 text-xs text-muted-foreground">{unit === 'L.S.' ? 'Enter 1 for one complete job and the fixed price as the rate.' : area ? 'Enter dimensions or enter the area directly.' : 'Enter the billable quantity in the selected unit.'} Changing the unit clears measurements and rate.</p>
 </div>;
}
