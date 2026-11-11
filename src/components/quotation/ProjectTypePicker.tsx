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
 return <TypeChoicePicker value={value} onChange={onChange} options={projectTypes.map(type=>({value:type}))} label="Project Type" heading="Interior project types" searchPlaceholder="Search or type a project type..." trigger={open=><Button id={id} type="button" variant="outline" role="combobox" aria-label="Project Type" aria-expanded={open} className="h-12 w-full justify-between gap-2 rounded-xl px-3 font-normal"><span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{selected || value || 'Choose Type'}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Button>} />;
}
