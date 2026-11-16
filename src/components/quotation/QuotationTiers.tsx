'use client';
import { useState } from 'react';
import { Layers3, Plus, Pencil, Download, Share2, Columns3 } from 'lucide-react';
import { quotationsApi } from '@/lib/api';
import { tierComparisonRows, tierPresets, type QuotationTierGroup } from '@/lib/quotationTiers';
import { useLocalization } from '@/hooks/useLocalization';
import { formatItemDetails } from '@/lib/itemSpecifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function QuotationTiers({ group, activeId, onRefresh, onSelect, onEdit, onExport }: {
  group: QuotationTierGroup; activeId: string; onRefresh: () => Promise<void>;
  onSelect: (id: string) => void; onEdit: (id: string) => void;
  onExport: (id: string, share: boolean) => Promise<void>;
}) {
  const { formatCurrency } = useLocalization();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'rename' | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [compare, setCompare] = useState(false);
  const firstTime = !group.tiers[0]?.tier_name;
  const current = group.tiers.find(tier => tier.id === activeId) || group.tiers[0];
  const save = async () => {
    if (!current || busy || !name.trim()) return;
    setBusy(true); setError('');
    try {
      if (mode === 'create') {
        const { data } = await quotationsApi.createTier(current.id, name);
        setOpen(false); onEdit(data.id);
      } else {
        await quotationsApi.nameTier(current.id, name);
        await onRefresh(); setMode(null); setName('');
      }
    } catch (cause) {
      setError(cause instanceof Error && /unique|duplicate/i.test(cause.message)
        ? 'This quotation already has a tier with that name. Choose another name.'
        : cause instanceof Error ? cause.message : 'Could not save the tier. Please try again.');
    } finally { setBusy(false); }
  };
  const exportTier = async (id: string, share: boolean) => {
    setBusy(true); setError('');
    try { await onExport(id, share); }
    catch { setError('Could not export this tier. Please try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" className="gap-2" onClick={() => { setError(''); setMode(null); setName(''); setOpen(true); }}><Layers3 className="h-4 w-4" />Tier</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className={`flex max-h-[90dvh] flex-col overflow-hidden ${compare && !firstTime && !mode ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <DialogHeader className="pr-6"><DialogTitle>{firstTime ? 'Name your first tier' : mode === 'create' ? 'Create another tier' : mode === 'rename' ? 'Rename tier' : 'Quotation tiers'}</DialogTitle><DialogDescription>{firstTime ? 'Choose a label for this saved quotation. Its items and prices stay as they are.' : mode === 'create' ? `Copy ${current?.tier_name} with the same client, rooms, items and prices, then adjust your new tier.` : 'One quotation, one client, multiple options. Compare your tiers or export an individual tier.'}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
        <div className="min-h-0 space-y-4 overflow-y-auto">
          {firstTime || mode ? <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">{tierPresets.map(preset => <Button key={preset} variant={name === preset ? 'default' : 'outline'} disabled={busy} onClick={() => setName(preset)}>{preset}</Button>)}</div>
            <div className="space-y-2"><Label htmlFor="tier-name">Tier name</Label><Input id="tier-name" placeholder="Basic, Standard, Luxury, or your own name" value={name} maxLength={40} disabled={busy} onChange={event => setName(event.target.value)} /></div>
            <div className="flex flex-wrap gap-2"><Button disabled={busy || !name.trim()} onClick={save}>{busy ? 'Saving...' : mode === 'create' ? 'Create tier and edit' : 'Save tier name'}</Button>{!firstTime && <Button variant="outline" disabled={busy} onClick={() => { setMode(null); setName(''); }}>Cancel</Button>}</div>
          </div> : <>
            <div className="flex flex-wrap gap-2"><Button className="gap-2" disabled={busy} onClick={() => { setName(''); setMode('create'); }}><Plus className="h-4 w-4" />Create another tier</Button><Button variant="outline" className="gap-2" disabled={group.tiers.length < 2 || busy} onClick={() => setCompare(value => !value)}><Columns3 className="h-4 w-4" />{compare ? 'Show tiers' : 'Compare tiers'}</Button><Button variant="ghost" disabled={busy} onClick={() => { setName(current.tier_name || ''); setMode('rename'); }}>Rename {current.tier_name}</Button></div>
            {compare ? <div className="overflow-x-auto rounded-xl border" tabIndex={0} role="region" aria-label="Tier comparison">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Quotation tiers compared by saved items, specifications, quantities, prices and totals</caption>
                <thead><tr><th className="min-w-36 border-b bg-muted/40 p-3">Compare</th>{group.tiers.map(tier => <th key={tier.id} scope="col" className="min-w-56 border-b border-l bg-muted/40 p-3"><p>{tier.tier_name}</p><p className="mt-1 font-normal text-muted-foreground">{formatCurrency(tier.grand_total || 0, true)}</p><Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => { setOpen(false); onSelect(tier.id); }}>Open {tier.tier_name}</Button></th>)}</tr></thead>
                <tbody>{tierComparisonRows(group.tiers).map(row => <tr key={row.key}><th scope="row" className="border-b p-3 align-top font-medium">{row.label}</th>{group.tiers.map((tier, index) => {
                  const [sectionIndex, itemIndex] = row.key.split(':').map(Number);
                  const item = tier.snapshot.sections[sectionIndex]?.items[itemIndex];
                  return <td key={tier.id} className="max-w-80 space-y-2 break-words border-b border-l p-3 align-top">{item ? <><p className="font-medium">{row.values[index]}</p><p className="whitespace-pre-wrap text-xs text-muted-foreground">{formatItemDetails(item.product_details, item.specifications)}</p><p>{Number(item.sft_area || 0)} {item.measurement_unit || 'Sq.ft'} × {formatCurrency(Number(item.rate_per_sft || 0), true)}</p><p className="font-medium">{formatCurrency(Number(item.amount || 0), true)}</p></> : <span className="text-muted-foreground">Not included</span>}</td>;
                })}</tr>)}
                {([['Subtotal','subtotal'],['Discount','discount_amount'],['Tax','gst_amount'],['Grand total','grand_total']] as const).map(([label,key]) => <tr key={key}><th scope="row" className="border-b p-3">{label}</th>{group.tiers.map(tier => <td key={tier.id} className="border-b border-l p-3 font-semibold tabular-nums">{formatCurrency(Number(tier.snapshot[key] || 0), true)}</td>)}</tr>)}
                <tr><th scope="row" className="p-3">Share an option</th>{group.tiers.map(tier => <td key={tier.id} className="border-l p-3"><Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => exportTier(tier.id,true)}><Share2 className="h-4 w-4" />Share {tier.tier_name}</Button></td>)}</tr>
                </tbody>
              </table>
            </div> : <div className="grid gap-3 sm:grid-cols-2">{group.tiers.map(tier => <div key={tier.id} className={`min-w-0 space-y-3 rounded-xl border p-4 ${tier.id === activeId ? 'border-primary bg-primary/5' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold">{tier.tier_name}</h3>{tier.id === activeId && <span className="text-xs text-primary">Viewing</span>}</div>
              <p className="text-xl font-semibold tabular-nums text-primary">{formatCurrency(tier.grand_total || 0,true)}</p>
              <p className="text-xs text-muted-foreground">{tier.snapshot.sections.length} rooms · {tier.snapshot.sections.reduce((sum,section) => sum + section.items.length,0)} items · {tier.status}</p>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => { setOpen(false); onSelect(tier.id); }}>Open</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => { setOpen(false); onEdit(tier.id); }}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => exportTier(tier.id,false)}><Download className="mr-1 h-3.5 w-3.5" />PDF</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => exportTier(tier.id,true)}><Share2 className="mr-1 h-3.5 w-3.5" />Share</Button></div>
            </div>)}</div>}
            <p className="text-xs text-muted-foreground">Client details are shared. Edit them in the original tier. If file sharing is unavailable, Share downloads the tier PDF.</p>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
