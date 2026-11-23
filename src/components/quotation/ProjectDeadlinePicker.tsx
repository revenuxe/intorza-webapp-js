'use client';
import { useState } from 'react';
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProjectDeadlinePicker({ value, proposalDate, onChange, id = 'projectDeadline', label = 'Project Deadline' }: {
  value: string; proposalDate: string; onChange: (value: string) => void; id?: string; label?: string;
}) {
  const [custom, setCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const proposal = parseISO(proposalDate);
  const base = isValid(proposal) ? proposal : new Date();
  const selected = parseISO(value);
  const days = isValid(selected) ? differenceInCalendarDays(selected, base) : NaN;
  const choice = custom ? 'custom' : isValid(selected) ? (customDate === value || ![7, 14, 30, 45].includes(days) ? 'date' : String(days)) : '';
  const dateMode = choice === 'custom' || choice === 'date';
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {dateMode ? <Input id={id} type="date" value={isValid(selected) ? value : ''} onChange={event => {
      const date = event.target.value;
      if (date && isValid(parseISO(date))) { setCustomDate(date); onChange(date); setCustom(false); }
      else if (!date) { setCustomDate(''); setCustom(false); onChange(''); }
    }} /> : <select id={id} value={choice} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={event => {
      const next = event.target.value;
      setCustom(next === 'custom');
      if (next !== 'custom' && next !== 'date') { setCustomDate(''); onChange(format(addDays(base, Number(next)), 'yyyy-MM-dd')); }
    }}>
      <option value="" disabled>Select duration</option>
      {[7, 14, 30, 45].map(day => <option key={day} value={day}>{day} days</option>)}
      {isValid(selected) && <option value="date">{format(selected, 'dd MMM yyyy')}</option>}
      <option value="custom">Custom</option>
    </select>}
  </div>;
}
