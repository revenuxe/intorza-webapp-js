'use client';

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypeChoicePicker } from './TypeChoicePicker';
import { ProjectTypePicker } from './ProjectTypePicker';
import { floorOptions, formatProjectTypeDetails, homeSizes, parseProjectTypeDetails, projectFloorNames } from '@/lib/projectTypeDetails';
import { FloorHomeSizePicker } from './FloorHomeSizePicker';

function DetailPicker({ id, label, value, options, placeholder, onChange }: {
  id: string; label: string; value: string; options: string[]; placeholder: string; onChange: (value: string) => void;
}) {
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <TypeChoicePicker value={value || 'Not specified'}
      onChange={next => onChange(next === 'Not specified' ? '' : next)}
      options={['Not specified', ...options].map(option => ({ value: option }))}
      label={label} heading={label} searchPlaceholder={`Search ${label.toLowerCase()}...`} allowCustom={false}
      trigger={open => <Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open}
        className="h-auto min-h-12 w-full justify-between whitespace-normal py-3 gap-1 rounded-xl px-2 text-sm font-normal sm:gap-2 sm:px-3">
        <span className="min-w-0 break-words text-left">{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>} />
  </div>;
}

export function ProjectTypeFields({ value, onChange, placeField }: { value: string; onChange: (value: string) => void; placeField?: ReactNode }) {
  const details = parseProjectTypeDetails(value);
  const residential = details.type.toLowerCase() === 'residential';
  const change = (next: Partial<typeof details>) => onChange(formatProjectTypeDetails({ ...details, ...next }));
  return <div className="grid min-w-0 grid-cols-2 items-end gap-x-5 gap-y-5 sm:gap-x-6">
    {placeField}
    <div className={`min-w-0 space-y-2 ${placeField ? '' : 'col-span-2'}`}>
      <Label htmlFor="projectType">Project Type</Label>
      <ProjectTypePicker id="projectType" value={details.type} onChange={type => change({ type, size: type.toLowerCase() === 'residential' ? details.size : '' })} />
    </div>
    <div className={residential ? 'min-w-0' : 'col-span-2 min-w-0'}>
      <DetailPicker id="projectFloors" label="Floors" value={details.floors} options={floorOptions} placeholder="Select Floors" onChange={floors => change({ floors, floorSizes: Object.fromEntries(Object.entries(details.floorSizes ?? {}).filter(([floor]) => projectFloorNames(floors).includes(floor))) })} />
    </div>
    {residential && (projectFloorNames(details.floors).length ? <div className="min-w-0 space-y-2">
      <Label htmlFor="projectBhk">BHK / Home Size</Label>
      <FloorHomeSizePicker floors={projectFloorNames(details.floors)} values={details.floorSizes ?? (details.floors === 'Ground Floor' && details.size ? { 'Ground Floor': details.size } : {})}
        previousSize={details.size} onChange={floorSizes => change({ size: '', floorSizes })} />
    </div> : details.floors === 'Other' ? <DetailPicker id="projectBhk" label="BHK / Home Size" value={details.size} options={homeSizes} placeholder="Select BHK" onChange={size => change({ size })} /> : <div className="min-w-0 space-y-2">
      <Label htmlFor="projectBhk">BHK / Home Size</Label>
      <Button id="projectBhk" type="button" variant="outline" disabled className="h-auto min-h-12 w-full justify-start whitespace-normal rounded-xl px-2 py-3 text-left text-sm font-normal sm:px-3">Select Floors</Button>
    </div>)}
  </div>;
}
