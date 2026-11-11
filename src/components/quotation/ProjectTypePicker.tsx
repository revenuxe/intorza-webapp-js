'use client';
import { useState } from 'react';
import { Check, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

export const projectTypes = [
  'Residential', 'Commercial', 'Office', 'Retail', 'Hospitality', 'Industrial',
  'Healthcare', 'Educational', 'Villa', 'Penthouse', 'Farmhouse', 'Apartment',
  'Bungalow', 'Duplex', 'Studio Apartment', 'Restaurant', 'Café', 'Hotel',
  'Salon & Spa', 'Showroom', 'Clinic', 'Co-working Space', 'Institutional',
  'Landscape & Outdoor', 'Other',
];

export function ProjectTypePicker({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const selected = projectTypes.find(type => type.toLowerCase() === value.toLowerCase());
  return <Popover open={open} onOpenChange={setOpen} modal>
    <PopoverTrigger asChild><Button id={id} type="button" variant="outline" role="combobox" aria-label="Project Type" aria-expanded={open} className="h-12 w-full justify-between gap-2 rounded-xl px-3 font-normal">
      <span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{selected || value || 'Choose Type'}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl p-0">
      <Command><CommandInput placeholder="Search project types..." aria-label="Search project types" /><CommandList className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overscroll-contain">
        <CommandEmpty>No matching project type. Try another name or choose Other.</CommandEmpty>
        {value && !selected && <CommandGroup heading="Current project type"><CommandItem value={value} onSelect={() => setOpen(false)} className="min-h-11 cursor-pointer"><span className="min-w-0 flex-1 break-words">{value}</span><Check className="ml-2 h-4 w-4 shrink-0 text-primary" /></CommandItem></CommandGroup>}
        <CommandGroup>{projectTypes.map(type => <CommandItem key={type} value={type} onSelect={() => { onChange(type); setOpen(false); }} className="min-h-11 cursor-pointer gap-2"><span className="flex-1">{type}</span>{selected === type && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}</CommandItem>)}</CommandGroup>
      </CommandList></Command>
    </PopoverContent>
  </Popover>;
}
