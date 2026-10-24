'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { combineItemDetails, specificationAttributes, splitItemDetails, type ItemSpecification } from '@/lib/itemSpecifications';

export function ItemSpecifications({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = splitItemDetails(value);
  const [open, setOpen] = useState(parsed.specifications.length > 0);
  const [fields, setFields] = useState(parsed.specifications);
  const [custom, setCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [error, setError] = useState('');
  const lastValue = useRef(value);
  const id = useId();
  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    const next = splitItemDetails(value);
    setFields(next.specifications); setError('');
    if (next.specifications.length) setOpen(true);
  }, [value]);
  const commit = (next: ItemSpecification[]) => {
    const combined = combineItemDetails(splitItemDetails(value).description, next);
    if (combined.length > 1000) { setError('Keep the description and specifications within 1,000 characters.'); return; }
    setFields(next); setError(''); lastValue.current = combined; onChange(combined);
  };
  const add = (label: string) => {
    const clean = label.trim();
    if (!clean || /[:\r\n]/.test(clean)) { setError('Enter a field name without a colon or line break.'); return; }
    if (fields.some(field => field.label.toLowerCase() === clean.toLowerCase())) { setError('This field has already been added.'); return; }
    setFields(current => [...current, { label: clean, value: '' }]); setError(''); setCustom(false); setCustomLabel('');
  };
  return <div className="min-w-0">
    <Button type="button" variant="ghost" size="sm" aria-expanded={open} aria-controls={`${id}-fields`} onClick={() => setOpen(current => !current)} className="h-auto gap-1.5 px-0 py-1 text-primary hover:bg-transparent"><Plus className="h-3.5 w-3.5" />{fields.length ? `Specifications (${fields.length})` : 'Add specifications'}<ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></Button>
    {open && <div id={`${id}-fields`} className="mt-3 space-y-3 rounded-xl border bg-background/70 p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">Add only what this item needs. Choose a suggestion or type your own value.</p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{fields.map((field, index) => <div key={field.label} className="min-w-0 space-y-1.5"><div className="flex items-center justify-between gap-2"><label htmlFor={`${id}-${index}`} className="text-xs font-medium">{field.label}</label><button type="button" aria-label={`Remove ${field.label} specification`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => commit(fields.filter((_, i) => i !== index))}><X className="h-3.5 w-3.5" /></button></div><Input id={`${id}-${index}`} list={`${id}-options-${index}`} value={field.value} maxLength={160} placeholder={`Enter ${field.label.toLowerCase()}`} onChange={event => commit(fields.map((row, i) => i === index ? { ...row, value: event.target.value } : row))} /><datalist id={`${id}-options-${index}`}>{(specificationAttributes[field.label] ?? []).map(option => <option key={option} value={option} />)}</datalist></div>)}</div>
      <div className="flex flex-wrap gap-2">{Object.keys(specificationAttributes).filter(label => !fields.some(field => field.label.toLowerCase() === label.toLowerCase())).map(label => <Button key={label} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2.5 text-xs" onClick={() => add(label)}><Plus className="mr-1 h-3 w-3" />{label}</Button>)}<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => setCustom(true)}><Plus className="mr-1 h-3 w-3" />Add custom field</Button></div>
      {custom && <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 space-y-1 text-xs">Custom field name<Input autoFocus value={customLabel} maxLength={40} placeholder="e.g. Warranty or Paint product" onChange={event => setCustomLabel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(customLabel); } }} /></label><Button type="button" size="sm" disabled={!customLabel.trim()} onClick={() => add(customLabel)}>Add field</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setCustom(false); setCustomLabel(''); }}>Cancel</Button></div>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>}
  </div>;
}
