'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
export function ItemSideSelector({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(false);
  const sides = ['', 'A', 'B', 'C', 'D'];
  return <div className="flex flex-wrap items-center gap-2"><label htmlFor={id} className="text-sm font-medium">Side</label><select id={id} aria-label="Side" className="h-9 w-24 rounded-lg border bg-background px-2 text-sm" value={custom ? '__custom__' : value} onChange={event => { if (event.target.value === '__custom__') setCustom(true); else { setCustom(false); onChange(event.target.value); } }}>
    {sides.map(side => <option key={side} value={side}>{side || 'None'}</option>)}
    {!sides.includes(value) && <option value={value}>{value}</option>}
    <option value="__custom__">Custom...</option>
  </select>{custom && <Input aria-label="Custom side" className="h-9 w-28" maxLength={20} value={value} onChange={event => onChange(event.target.value)} />}</div>;
}
