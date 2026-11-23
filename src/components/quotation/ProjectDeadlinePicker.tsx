'use client';
import { useState } from 'react';
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

export function ProjectDeadlinePicker({ value, proposalDate, onChange }: {
  value: string; proposalDate: string; onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  const proposal = parseISO(proposalDate);
  const base = isValid(proposal) ? proposal : new Date();
  const selected = parseISO(value);
  const days = isValid(selected) ? differenceInCalendarDays(selected, base) : NaN;
  const choice = custom || (value && ![7, 14, 30, 45].includes(days)) ? 'custom' : value ? String(days) : '';
  return <div className="min-w-0 space-y-2">
    <Label htmlFor="projectDeadline">Project Deadline</Label>
    <select id="projectDeadline" value={choice} className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm" onChange={event => {
      const next = event.target.value;
      setCustom(next === 'custom');
      if (next !== 'custom') onChange(format(addDays(base, Number(next)), 'yyyy-MM-dd'));
    }}>
      <option value="" disabled>Select deadline</option>
      {[7, 14, 30, 45].map(day => <option key={day} value={day}>{day} days</option>)}
      <option value="custom">Custom</option>
    </select>
    <p className="text-xs text-muted-foreground">{isValid(selected) ? `Due ${format(selected, 'dd MMM yyyy')}. ` : ''}Days from {isValid(proposal) ? 'the proposal date' : 'today'}.</p>
    {choice === 'custom' && <div className="w-fit max-w-full rounded-xl border bg-background">
      <Calendar mode="single" selected={isValid(selected) ? selected : undefined} defaultMonth={isValid(selected) ? selected : base} onSelect={date => { if (date) onChange(format(date, 'yyyy-MM-dd')); }} />
    </div>}
  </div>;
}
