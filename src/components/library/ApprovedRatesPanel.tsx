'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Rate = Database['public']['Tables']['quotation_approved_rates']['Row'];
export function ApprovedRatesPanel({ currency }: { currency: string }) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(''); const [specification, setSpecification] = useState('');
  const [rate, setRate] = useState(''); const [location, setLocation] = useState('');
  const [inclusions, setInclusions] = useState(''); const [unit, setUnit] = useState('sqft');
  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const result = await supabase.from('quotation_approved_rates').select('*').eq('user_id', user.id).eq('active', true).order('verified_at', { ascending: false });
    if (result.error) { setError('Approved AI rates are unavailable. Apply the floor plan database migration first.'); return; }
    setRates(result.data ?? []);
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    if (!name.trim() || rate === '' || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 10000000 || !specification.trim() || !inclusions.trim()) {
      setError('Enter the product, specifications, a valid rate and what the price includes.'); return;
    }
    setBusy(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Please sign in again.');
      const result = await supabase.from('quotation_approved_rates').insert({ user_id: user.id, product_name: name.trim(), specification: specification.trim(), rate: Number(rate), unit, currency,
        location: location.trim(), inclusions: `GST excluded. ${inclusions.trim()}`, verified_at: new Date().toISOString() });
      if (result.error) throw new Error('Could not approve the rate. Check your connection and database migration.');
      setName(''); setSpecification(''); setRate(''); setInclusions(''); setExpanded(false); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this rate.'); }
    finally { setBusy(false); }
  }
  async function deactivate(id: string) {
    setBusy(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Please sign in again.');
      const result = await supabase.from('quotation_approved_rates').update({ active: false }).eq('id', id).eq('user_id', user.id);
      if (result.error) throw new Error('Could not deactivate this rate.');
      setRates(current => current.filter(row => row.id !== id));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not change this rate.'); }
    finally { setBusy(false); }
  }
  return <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-6" aria-label="Approved pricing for AI">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Approved pricing for AI</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep approved selling rates separate from past quotation history.</p></div><Button type="button" variant="outline" onClick={() => setExpanded(value => !value)}>{expanded ? 'Cancel' : 'Approve a rate'}</Button></div>
    {expanded && <form className="space-y-3 rounded-xl bg-muted/30 p-3" onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="approved-product">Product name</Label><Input id="approved-product" value={name} onChange={event => setName(event.target.value)} required maxLength={150} /></div><div className="space-y-1"><Label htmlFor="approved-location">City (blank for all locations)</Label><Input id="approved-location" value={location} onChange={event => setLocation(event.target.value)} maxLength={150} /></div></div>
      <div className="space-y-1"><Label htmlFor="approved-specification">Exact materials and specifications</Label><Input id="approved-specification" value={specification} onChange={event => setSpecification(event.target.value)} maxLength={1000} required /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="approved-price">Rate ({currency}, excluding GST)</Label><Input id="approved-price" type="number" value={rate} onChange={event => setRate(event.target.value)} required min="0" max="10000000" /></div><div className="space-y-1"><Label htmlFor="approved-unit">Unit</Label><select id="approved-unit" value={unit} onChange={event => setUnit(event.target.value)} className="h-10 w-full rounded-md border bg-background px-2 text-base">{[['sqft','Square foot'],['rft','Running foot'],['piece','Piece'],['set','Set'],['lump_sum','Lump sum']].map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div></div>
      <div className="space-y-1"><Label htmlFor="approved-inclusions">Labour, hardware, installation, transport and wastage inclusions</Label><Input id="approved-inclusions" value={inclusions} onChange={event => setInclusions(event.target.value)} maxLength={600} required placeholder="State what is included and what is charged separately" /></div>
      <p className="text-xs leading-5 text-muted-foreground">Approving confirms this selling rate for your business. This quotation editor currently inserts square-foot items; other units are stored for future support.</p><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm approved rate'}</Button>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!rates.length && !error && <p className="text-sm text-muted-foreground">No approved rates yet. AI will label historical rates or leave prices pending.</p>}
    {rates.map(row => <div key={row.id} className="flex min-w-0 items-start gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1 break-words"><p className="text-sm font-medium">{row.product_name} · {row.currency} {row.rate}/{row.unit}</p><p className="mt-1 text-xs text-muted-foreground">{row.specification}</p><p className="mt-1 text-xs text-muted-foreground">{row.location || 'All locations'} · Approved {row.verified_at.slice(0, 10)} · {row.inclusions}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Deactivate ${row.product_name}`} disabled={busy} onClick={() => void deactivate(row.id)}><Trash2 className="h-4 w-4" /></Button></div>)}
  </section>;
}
