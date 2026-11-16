'use client';
import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { quotationsApi } from '@/lib/api';
import { quotationVersionChanges, type QuotationVersion, type QuotationVersionDetail } from '@/lib/quotationVersions';
import { useLocalization } from '@/hooks/useLocalization';
import { formatItemDetails } from '@/lib/itemSpecifications';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function QuotationVersions({ quotationId, onRestored }: { quotationId: string; onRestored: () => Promise<void> }) {
  const { formatCurrency, formatDateShort } = useLocalization();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<QuotationVersionDetail | null>(null);
  const [previous, setPrevious] = useState<QuotationVersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(''); setVersions([]); setDetail(null); setSelected(null); setConfirm(false);
    quotationsApi.versions(quotationId).then(({ data }) => {
      if (active) { setVersions(data); setSelected(data[0]?.version_number ?? null); }
    }).catch(() => { if (active) setError('Could not load version history. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, quotationId, refresh]);

  useEffect(() => {
    if (!open || selected === null) return;
    let active = true;
    setDetailLoading(true); setDetail(null); setPrevious(null); setError(''); setConfirm(false);
    Promise.all([
      quotationsApi.version(quotationId, selected),
      selected > 1 ? quotationsApi.version(quotationId, selected - 1) : Promise.resolve(null),
    ]).then(([current, before]) => {
      if (active) { setDetail(current.data); setPrevious(before?.data ?? null); }
    }).catch(() => { if (active) setError('Could not load this version. Please try again.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [open, quotationId, selected, refresh]);

  const restore = async () => {
    if (!detail || !versions[0] || restoring) return;
    setRestoring(true); setError('');
    try {
      await quotationsApi.revertVersion(quotationId, detail.id, versions[0].version_number);
      setNotice(`Version ${detail.version_number} restored and saved as a new version.`);
      setConfirm(false);
      await onRestored();
      setRefresh(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revert this version. Please try again.');
    } finally { setRestoring(false); }
  };
  const changes = detail ? quotationVersionChanges(previous?.snapshot ?? null, detail.snapshot) : [];
  const snapshot = detail?.snapshot;
  const latest = detail?.version_number === versions[0]?.version_number;

  return <>
    <Button variant="outline" className="gap-2" onClick={() => { setNotice(''); setOpen(true); }}><History className="h-4 w-4" />Versions</Button>
    <Dialog open={open} onOpenChange={value => { if (!restoring) setOpen(value); }}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="pr-6">
          <DialogTitle>Quotation versions</DialogTitle>
          <DialogDescription>View saved versions and restore an earlier one. Reverting keeps your history and creates a new saved version.</DialogDescription>
        </DialogHeader>
        {notice && <p role="status" className="rounded-lg bg-primary/5 p-3 text-sm">{notice}</p>}
        {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm"><p>{error}</p><Button variant="outline" size="sm" disabled={restoring} onClick={() => setRefresh(value => value + 1)}>Refresh versions</Button></div>}
        {loading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading versions...</p> : !versions.length && !error ? <p className="py-6 text-sm text-muted-foreground">No saved versions yet. History starts with the current saved quotation; earlier edits are unavailable.</p> : <div className="grid min-h-0 gap-4 overflow-y-auto md:grid-cols-[12rem_minmax(0,1fr)]">
          <nav aria-label="Saved quotation versions" className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-x-visible">
            {versions.map(version => <button key={version.id} type="button" disabled={restoring} aria-current={selected === version.version_number ? 'true' : undefined}
              className={`shrink-0 rounded-xl border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === version.version_number ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              onClick={() => { setNotice(''); setSelected(version.version_number); }}>
              <span className="block font-semibold">Version {version.version_number}{version.version_number === versions[0]?.version_number && <span className="ml-2 text-xs font-normal text-primary">Latest</span>}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{formatDateShort(version.saved_at)} · {new Date(version.saved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>)}
          </nav>
          <div className="min-w-0 space-y-4">
            {detailLoading && <p role="status" className="py-6 text-sm text-muted-foreground">Loading saved quotation...</p>}
            {detail && snapshot && <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Version {detail.version_number}</h3>
                <Button variant="outline" className="gap-2" disabled={latest || restoring} onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" />{latest ? 'Latest version' : 'Revert to this version'}</Button>
              </div>
              {confirm && <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm">Restore Version {detail.version_number}? This replaces the current quotation details, rooms, items, and prices. Your current version stays in history.</p>
                <div className="flex flex-wrap gap-2"><Button disabled={restoring} onClick={restore}>{restoring ? 'Reverting...' : 'Confirm revert'}</Button><Button variant="outline" disabled={restoring} onClick={() => setConfirm(false)}>Cancel</Button></div>
              </div>}
              <section className="space-y-3 rounded-xl border p-4" aria-label="Version changes">
                <h4 className="text-sm font-semibold">{previous ? `Changes from Version ${previous.version_number}` : 'First recorded version'}</h4>
                {!previous ? <p className="text-sm text-muted-foreground">History starts here. Edits made before version history was enabled are unavailable.</p> : changes.length ? <ul className="space-y-3">{changes.map((change, index) => <li key={index} className="min-w-0 break-words text-sm"><p className="font-medium">{change.label}</p><p className="mt-1 text-muted-foreground"><span className="line-through">{change.before}</span><span aria-hidden="true"> → </span><span className="sr-only"> changed to </span><span className="text-foreground">{change.after}</span></p></li>)}</ul> : <p className="text-sm text-muted-foreground">Saved without content changes.</p>}
              </section>
              <section className="space-y-4 rounded-xl border p-4" aria-label="Saved quotation">
                <div><h4 className="break-words font-semibold">{String(snapshot.quotation_title || snapshot.project_name || 'Quotation')}</h4><p className="mt-1 break-words text-sm text-muted-foreground">{String(snapshot.client_name || 'Client to be confirmed')}</p><p className="mt-2 text-lg font-semibold text-primary">{formatCurrency(Number(snapshot.grand_total || 0), true)}</p></div>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">{[
                  ['Client address', snapshot.client_address], ['Project location', snapshot.place_of_project],
                  ['Proposal date', snapshot.date_of_proposal], ['Valid till', snapshot.valid_till],
                  ['Project deadline', snapshot.project_deadline], ['Project type', snapshot.project_type],
                  ['Warranty', snapshot.warranty], ['Status', snapshot.status], ['Notes', snapshot.notes],
                ].map(([label, value]) => <div key={String(label)} className="min-w-0 break-words"><dt className="text-muted-foreground">{String(label)}</dt><dd>{String(value || '—')}</dd></div>)}</dl>
                {snapshot.sections.map((section, index) => <div key={index} className="space-y-3 border-t pt-3"><h5 className="break-words text-sm font-semibold">{section.section_name}</h5>{section.items.map((item, itemIndex) => <div key={itemIndex} className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm"><p className="break-words font-medium">{item.product_name}</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{formatItemDetails(item.product_details, item.specifications)}</p><p className="text-muted-foreground">{Number(item.sft_area || 0)} {item.measurement_unit || 'Sq.ft'} × {formatCurrency(Number(item.rate_per_sft || 0), true)}</p><p className="font-semibold">{formatCurrency(Number(item.amount || 0), true)}</p></div>)}</div>)}
                <dl className="space-y-2 border-t pt-3 text-sm">{[['Subtotal', snapshot.subtotal], ['Discount', snapshot.discount_amount], ['Tax', snapshot.gst_amount], ['Grand total', snapshot.grand_total]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-3"><dt>{String(label)}</dt><dd className="font-medium tabular-nums">{formatCurrency(Number(value || 0), true)}</dd></div>)}</dl>
              </section>
            </>}
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
