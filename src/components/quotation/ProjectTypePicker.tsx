'use client';
import { ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypeChoicePicker } from './TypeChoicePicker';

export const projectTypes = [
  'Residential', 'Commercial', 'Office', 'Retail', 'Hospitality', 'Industrial',
  'Healthcare', 'Educational', 'Villa', 'Penthouse', 'Farmhouse', 'Apartment',
  'Bungalow', 'Duplex', 'Studio Apartment', 'Restaurant', 'Café', 'Hotel',
  'Salon & Spa', 'Showroom', 'Clinic', 'Co-working Space', 'Institutional',
  'Landscape & Outdoor', 'Other',
];

export function ProjectTypePicker({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
 const selected=projectTypes.find(type=>type.toLowerCase()===value.toLowerCase());
 return <TypeChoicePicker value={value} onChange={onChange} options={projectTypes.map(type=>({value:type}))} label="Project Type" heading="Interior project types" searchPlaceholder="Search or type a project type..." trigger={open=><Button id={id} type="button" variant="outline" role="combobox" aria-label="Project Type" aria-expanded={open} className="h-auto min-h-12 w-full justify-between whitespace-normal py-3 gap-1.5 rounded-xl px-2.5 text-sm font-normal sm:gap-2 sm:px-3"><span className="flex min-w-0 items-center gap-2"><Building2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" /><span className="min-w-0 break-words text-left">{selected || value || 'Choose Type'}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Button>} />;
}
