'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, History, RotateCcw } from 'lucide-react';
import { quotationsApi } from '@/lib/api';
import { quotationVersionChanges, type QuotationVersion, type QuotationVersionDetail } from '@/lib/quotationVersions';
import { useLocalization } from '@/hooks/useLocalization';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function QuotationVersions({ quotationId, onRestored }: { quotationId: string; onRestored: () => Promise<void> }) {
  const { formatDateShort } = useLocalization();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [details, setDetails] = useState<Record<number, QuotationVersionDetail>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(''); setVersions([]); setDetails({});
    setSelected(null); setVisibleCount(10); setConfirm(false);
    quotationsApi.versions(quotationId).then(({ data }) => {
      if (active) setVersions(data);
    }).catch(() => { if (active) setError('Could not load version history. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, quotationId, refresh]);

  useEffect(() => {
    if (!open || !versions.length) return;
    let active = true;
    // One page plus its preceding snapshot; reuse cached snapshots and bound requests.
    const pending = versions.slice(0, visibleCount + 1).filter(version => !details[version.version_number]);
    let cursor = 0;
    setSummariesLoading(true);
    const worker = async () => {
      while (active && cursor < pending.length) {
        const version = pending[cursor++];
        const { data } = await quotationsApi.version(quotationId, version.version_number);
        if (active) setDetails(current => ({ ...current, [version.version_number]: data }));
      }
    };
    Promise.allSettled(Array.from({ length: Math.min(3, pending.length) }, worker))
      .then(results => { if (active && results.some(result => result.status === 'rejected')) setError('Some changes could not be loaded. Refresh versions to try again.'); })
      .finally(() => { if (active) setSummariesLoading(false); });
    return () => { active = false; };
    // Cache updates must not restart requests already in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quotationId, versions, visibleCount]);

  const restore = async () => {
    const detail = selected === null ? null : details[selected];
    if (!detail || !versions[0] || selected === versions[0].version_number || restoring) return;
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

  return <>
    <Button variant="outline" className="gap-2" onClick={() => { setNotice(''); setOpen(true); }}><History className="h-4 w-4" />Versions</Button>
    <Dialog open={open} onOpenChange={value => { if (!restoring) setOpen(value); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>See what changed. Tap a version to restore it.</DialogDescription>
        </DialogHeader>
        {notice && <p role="status" className="rounded-lg bg-primary/5 p-3 text-sm">{notice}</p>}
        {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm"><p>{error}</p><Button variant="outline" size="sm" disabled={restoring} onClick={() => setRefresh(value => value + 1)}>Refresh versions</Button></div>}
        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-y-contain pb-1">
          {loading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading versions...</p> : !versions.length && !error ? <p className="py-6 text-sm text-muted-foreground">No saved versions yet.</p> : <ul aria-label="Saved quotation versions" className="space-y-3">
            {versions.slice(0, visibleCount).map(version => {
              const number = version.version_number;
              const detail = details[number];
              const previous = details[number - 1];
              const ready = Boolean(detail && (number === 1 || previous));
              const changes = ready ? quotationVersionChanges(previous?.snapshot ?? null, detail.snapshot) : [];
              const expanded = selected === number;
              const latest = number === versions[0]?.version_number;
              const summary = !ready ? 'Loading changes...' : number === 1 ? 'First saved version' : !changes.length ? 'Saved without changes' : changes.slice(0, 3).map(change => change.label).join(' · ') + (changes.length > 3 ? ` · +${changes.length - 3} more` : '');
              return <li key={version.id} className={`overflow-hidden rounded-xl border ${expanded ? 'border-primary/50' : 'border-border'}`}>
                <button type="button" aria-expanded={expanded} aria-controls={`version-${version.id}-changes`} disabled={restoring} className="w-full space-y-2 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" onClick={() => { setSelected(expanded ? null : number); setConfirm(false); }}>
                  <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-semibold">Version {number}{latest && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Latest</span>}</span><ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
                  <span className="block text-xs text-muted-foreground">{formatDateShort(version.saved_at)} · {new Date(version.saved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="line-clamp-2 break-words text-sm leading-5 text-muted-foreground">{summary}</span>
                </button>
                {expanded && <div id={`version-${version.id}-changes`} className="space-y-4 border-t px-4 pb-4 pt-3">
                  {ready && number > 1 && changes.length > 0 && <ul aria-label={`Changes in Version ${number}`} className="space-y-3">{changes.map((change, index) => <li key={index} className="min-w-0 break-words text-sm"><p className="font-medium">{change.label}</p><div className="mt-1 space-y-1 text-xs leading-5"><p className="text-muted-foreground">Before: {change.before}</p><p>After: {change.after}</p></div></li>)}</ul>}
                  {number === 1 && <p className="text-xs leading-5 text-muted-foreground">History starts with this saved version. Earlier edits are unavailable.</p>}
                  {latest ? <p className="text-xs text-muted-foreground">This is your current saved version.</p> : confirm ? <div className="space-y-3"><p className="text-sm">Restore Version {number}? Your current version will stay in history.</p><div className="grid grid-cols-2 gap-3 [&>button]:h-11 [&>button]:rounded-xl"><Button disabled={restoring} onClick={restore}>{restoring ? 'Reverting...' : 'Confirm revert'}</Button><Button variant="outline" disabled={restoring} onClick={() => setConfirm(false)}>Cancel</Button></div></div> : <Button aria-label="Revert to this version" className="h-11 w-full gap-2 rounded-xl" disabled={!ready || restoring} onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" />Revert to Version {number}</Button>}
                </div>}
              </li>;
            })}
          </ul>}
          {visibleCount < versions.length && <Button variant="outline" className="h-11 w-full rounded-xl" disabled={summariesLoading || restoring} onClick={() => setVisibleCount(count => count + 10)}>Show older versions</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
