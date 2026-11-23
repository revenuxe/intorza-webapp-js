'use client';
import { useEffect, useId, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatItemDetails } from '@/lib/itemSpecifications';
import type { QuotationTier } from '@/lib/quotationTiers';
import { parseProjectTypeDetails } from '@/lib/projectTypeDetails';

type AdminTier = QuotationTier & { quotation_number: string; created_at: string; version_count: number };
type Detail = { root_id: string; user_email: string | null; tiers: AdminTier[] };
export function AdminQuotationDetail({ quotationId, onClose, formatCurrency }: { quotationId: string | null; onClose: () => void; formatCurrency: (value: number) => string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const selectId = useId();
  useEffect(() => {
    if (!quotationId) return;
    let active = true;
    setLoading(true); setData(null); setError('');
    Promise.resolve(supabase.rpc('admin_quotation_detail', { p_id: quotationId })).then(result => {
      if (result.error) throw result.error;
      const detail = result.data as unknown as Detail;
      if (!detail || !Array.isArray(detail.tiers) || !detail.tiers.length) throw new Error('Invalid quotation response');
      if (active) { setData(detail); setSelected(detail.tiers.some(tier => tier.id === quotationId) ? quotationId : detail.tiers[0].id); }
    }).catch(() => { if (active) setError('Unable to open this quotation. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [quotationId, retry]);
  const tier = data?.tiers.find(option => option.id === selected);
  const snapshot = tier?.snapshot;
  const project = parseProjectTypeDetails(String(snapshot?.project_type || ''));
  return <Dialog open={Boolean(quotationId)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-3 overflow-hidden p-3.5 sm:p-6">
      <DialogHeader className="shrink-0 pr-7 text-left"><DialogTitle className="text-base sm:text-lg">Quotation details</DialogTitle><DialogDescription className="text-xs sm:text-sm">Select a tier to inspect its saved quotation. Admin view is read-only.</DialogDescription></DialogHeader>
      {loading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading quotation...</p> : error ? <div role="alert" className="space-y-3 rounded-xl border p-4"><p>{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry quotation</Button></div> : data && tier && snapshot ? <>
        <div className="shrink-0 space-y-1.5"><label htmlFor={selectId} className="text-xs font-medium">Quotation tier</label><select id={selectId} value={selected} onChange={event => setSelected(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{data.tiers.map(option => <option key={option.id} value={option.id}>{option.tier_name || 'Original quotation'} · {formatCurrency(option.grand_total || 0)}</option>)}</select></div>
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-y-contain pb-1">
          <section className="space-y-3 rounded-xl border p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{String(snapshot.quotation_title || snapshot.project_name || 'Untitled quotation')}</h3><p className="mt-1 text-sm text-muted-foreground">{tier.tier_name || 'Original quotation'}</p><p className="mt-2 font-mono text-xs">Ref QNO: {data.tiers[0].reference_no}</p></div><Badge variant="secondary" className="shrink-0 capitalize">{tier.status}</Badge></div>
            <p className="text-2xl font-semibold tabular-nums text-primary">{formatCurrency(Number(snapshot.grand_total || 0))}</p>
            <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">{[
              ['Account', data.user_email], ['Client', snapshot.client_name], ['Client address', snapshot.client_address],
              ['Project location', snapshot.place_of_project], ['Project type', project.type],
              ['Floors', project.floors], ['BHK / home size', project.size],
              ...Object.entries(project.floorSizes || {}).map(([floor, size]) => [`${floor} home size`, size]),
              ['Proposal date', snapshot.date_of_proposal], ['Valid till', snapshot.valid_till], ['Deadline', snapshot.project_deadline],
              ['Quotation number', tier.quotation_number], ['Saved versions', tier.version_count],
            ].map(([label,value]) => <div key={String(label)} className="min-w-0 break-words"><dt className="text-xs text-muted-foreground">{String(label)}</dt><dd className="mt-1">{value === null || value === undefined || value === '' ? '—' : String(value)}</dd></div>)}</dl>
          </section>
          {snapshot.sections.length ? snapshot.sections.map((section,index) => <section key={index} className="space-y-3 rounded-xl border p-3 sm:p-4"><h4 className="break-words text-sm font-semibold">{section.section_name}</h4>{section.items.map((item,itemIndex) => <article key={itemIndex} className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm"><div className="flex items-start justify-between gap-3"><h5 className="min-w-0 break-words font-medium">{item.product_name || `Item ${itemIndex + 1}`}</h5><span className="shrink-0 font-semibold tabular-nums">{formatCurrency(Number(item.amount || 0))}</span></div><p className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{formatItemDetails(item.product_details,item.specifications)}</p><p className="text-xs">{Number(item.sft_area || 0)} {item.measurement_unit || 'Sq.ft'} × {formatCurrency(Number(item.rate_per_sft || 0))}</p>{(item.width_ft || item.height_ft) ? <p className="text-xs text-muted-foreground">Width: {Number(item.width_ft || 0)} ft · Height: {Number(item.height_ft || 0)} ft{item.side ? ` · Side: ${String(item.side)}` : ''}</p> : null}</article>)}</section>) : <p className="rounded-xl border p-4 text-sm text-muted-foreground">No rooms or items saved in this tier.</p>}
          <dl className="space-y-3 rounded-xl border p-3 text-sm sm:p-4">{[['Subtotal','subtotal'],['Discount','discount_amount'],['Tax','gst_amount'],['Grand total','grand_total']].map(([label,key]) => <div key={key} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular-nums">{formatCurrency(Number(snapshot[key] || 0))}</dd></div>)}</dl>
        </div>
      </> : null}
    </DialogContent>
  </Dialog>;
}
