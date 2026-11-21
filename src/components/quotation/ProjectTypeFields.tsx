'use client';

import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypeChoicePicker } from './TypeChoicePicker';
import { ProjectTypePicker } from './ProjectTypePicker';

const homeSizes = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', '6 BHK', 'Other', 'Studio'];

// Keep the existing project-type persistence and PDF contract intact.
export function residentialProjectType(value: string) {
  const match = value.trim().match(/^Residential(?:\s*[-–—·]\s*(Studio|[1-6] BHK|Other))?$/i);
  return match ? { type: 'Residential', size: homeSizes.find(size => size.toLowerCase() === match[1]?.toLowerCase()) ?? '' } : null;
}

export function ProjectTypeFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const residential = residentialProjectType(value);
  return <div className={`grid min-w-0 items-end gap-x-5 gap-y-3 sm:gap-x-6 ${residential ? 'grid-cols-2' : 'grid-cols-1'}`}>
    <div className="min-w-0 space-y-2">
      <Label htmlFor="projectType">Project Type</Label>
      <ProjectTypePicker id="projectType" value={residential?.type ?? value} onChange={type => {
        if (type.toLowerCase() === 'residential' && residential?.size) onChange(`Residential - ${residential.size}`);
        else onChange(type);
      }} />
    </div>
    {residential && <div className="min-w-0 space-y-2">
      <Label htmlFor="projectBhk">BHK / Home Size</Label>
      <TypeChoicePicker value={residential.size || 'Not specified'}
        onChange={size => onChange(size === 'Not specified' ? 'Residential' : `Residential - ${size}`)}
        options={['Not specified', ...homeSizes].map(size => ({ value: size }))}
        label="BHK / Home Size" heading="Home sizes" searchPlaceholder="Search home sizes..." allowCustom={false}
        trigger={open => <Button id="projectBhk" type="button" variant="outline" role="combobox" aria-label="BHK / Home Size" aria-expanded={open}
          className="h-auto min-h-12 w-full justify-between whitespace-normal py-3 gap-1 rounded-xl px-2 text-sm font-normal sm:gap-2 sm:px-3">
          <span className="min-w-0 break-words text-left">{residential.size || 'Select BHK'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>} />
    </div>}
  </div>;
}
