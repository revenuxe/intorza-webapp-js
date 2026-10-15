'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileUp, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { MAX_PLAN_BYTES } from '@/lib/quotation-ai/floor-plan';
import type { TrainingExtraction } from '@/lib/quotation-ai/training';

import { AIPriceCatalogue } from './AIPriceCatalogue';

type Document = { id: string; filename: string; status: string; extraction: TrainingExtraction; created_at: string };
export function AITrainingPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [documentPage, setDocumentPage] = useState(0), [documentTotal, setDocumentTotal] = useState(0);
  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const reviewPanel = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const pending = useRef(false); const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const api = useCallback(async (body?: FormData | object, page = 0) => {
    const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error('Please sign in again.');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 90000);
    try {
      const response = await fetch(`/api/admin/ai/training?page=${page}`, { method: body ? 'POST' : 'GET', signal: controller.current.signal,
        headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
      const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error || 'The training request failed.'), { status: response.status }); return result;
    } finally { clearTimeout(timeout); }
  }, []);
  const load = useCallback(async (page = 0) => {
    if (pending.current) return; pending.current = true; setBusy('Loading references'); setError('');
    try { const result = await api(undefined, page); setDocumentPage(page); setDocumentTotal(result.total ?? result.documents.length); setDocuments(current => page === 0 ? result.documents : [...new Map([...current, ...result.documents].map(row => [row.id, row])).values()]); setSelected(current => page === 0 ? result.documents.find((row: Document) => row.id === current?.id) ?? result.documents[0] ?? null : current); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load the library.'); }
    finally { pending.current = false; setBusy(''); }
  }, [api]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; controller.current?.abort(); }; }, [load]);
  async function upload() {
    if (!files.length || pending.current) return;
    pending.current = true; setError(''); setNotice('');
    const remaining: File[] = []; const failures: string[] = []; let uploaded = 0;
    try {
      for (let index = 0; index < files.length; index++) {
        if (!mounted.current) break;
        const file = files[index];
        setBusy(`Analysing quotation ${index + 1} of ${files.length}: ${file.name}`);
        if (!file.size || file.size > MAX_PLAN_BYTES || !/\.pdf$/i.test(file.name)) {
          remaining.push(file); failures.push(`${file.name}: choose a non-empty PDF under 10 MB.`); continue;
        }
        try {
          const body = new FormData(); body.append('file', file);
          const result = await api(body);
          setDocuments(current => [result.document, ...current]); setDocumentTotal(value => value + 1);
          setSelected(result.document); setConfirmed(false); uploaded++;
        } catch (failure) {
          const status = (failure as { status?: number }).status;
          failures.push(`${file.name}: ${failure instanceof Error ? failure.message : 'Could not read this PDF.'}`);
          if (status !== 409) remaining.push(file);
          if (controller.current?.signal.aborted || [401, 403, 429, 503].includes(status ?? 0)) {
            remaining.push(...files.slice(index + 1)); break;
          }
        }
      }
      setFiles(remaining);
      if (!remaining.length && fileInput.current) fileInput.current.value = '';
      setNotice(`${uploaded} quotation(s) analysed. Review each document before publishing.${remaining.length ? ' Remaining files are kept for retry.' : ''}`);
      if (failures.length) setError(failures.join('\n'));
    } finally { pending.current = false; setBusy(''); }
  }
  async function review(action: 'approve' | 'reject') {
    if (!selected || pending.current) return;
    pending.current = true; setBusy(action === 'approve' ? 'Publishing reviewed patterns' : 'Removing published patterns'); setError(''); setNotice('');
    try {
      await api({ id: selected.id, action, extraction: action === 'reject' ? documents.find(row => row.id === selected.id)?.extraction ?? selected.extraction : selected.extraction, confirmAnonymized: confirmed });
      const next = { ...selected, status: action === 'approve' ? 'approved' : 'rejected' };
      setCatalogueRevision(value => value + 1); setSelected(next); setDocuments(current => current.map(row => row.id === next.id ? next : row));
      setNotice(action === 'approve' ? 'Published. New quotation requests can now use these reviewed references.' : 'Rejected. These patterns are excluded from new quotations.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the review.'); }
    finally { pending.current = false; setBusy(''); }
  }
  function editItem(index: number, patch: Partial<TrainingExtraction['items'][number]>) {
    setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: current.extraction.items.map((item, i) => i === index ? { ...item, ...patch } : item) } } : null);
  }
  return <section className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="h-5 w-5 text-primary" />Train AI</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Teach Intorza your quotation patterns with reviewed PDF references. Approved materials, sections and rates guide future estimates. This adds reference knowledge; it does not retrain the model.</p></div><Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <div className="rounded-2xl border bg-card p-4 sm:p-5"><Label htmlFor="training-pdf" className="text-base font-semibold">Upload quotation PDFs</Label><p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">Select multiple PDFs, up to 10 MB each. Add as many quotations as you need; files are analysed one at a time. Raw documents remain admin-only. Shared references must contain no customer or confidential data.</p><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Input id="training-pdf" ref={fileInput} type="file" multiple accept=".pdf,application/pdf" className="min-w-0 flex-1" disabled={!!busy} onChange={event => { setFiles(Array.from(event.target.files ?? [])); setError(''); }} /><Button type="button" disabled={!files.length || !!busy} onClick={() => void upload()}><FileUp className="mr-2 h-4 w-4" />Analyse {files.length || ''} quotation{files.length === 1 ? '' : 's'}</Button></div></div>
    {!!files.length && !busy && <p className="text-xs text-muted-foreground">{files.length} PDF(s) queued for analysis.</p>}
    {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p>}
    {error && <p role="alert" className="rounded-xl whitespace-pre-line bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    <div className="grid min-w-0 gap-4 items-start lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start overflow-hidden rounded-2xl border bg-card lg:sticky lg:top-4">
        <div className="space-y-3 border-b p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Reference library</h3><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{documentTotal}</span></div><Input aria-label="Search reference library" placeholder="Find a quotation?" value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} /></div>
        <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain p-2 lg:max-h-[min(65vh,640px)]">
          {!documents.length && !busy && <p className="p-3 text-sm text-muted-foreground">Upload your first quotation to start the library.</p>}
          {!!documents.length && !documents.some(document => document.filename.toLowerCase().includes(librarySearch.toLowerCase())) && <p className="p-3 text-sm text-muted-foreground">No matching loaded quotations. Load more or change your search.</p>}
          {documents.filter(document => document.filename.toLowerCase().includes(librarySearch.toLowerCase())).map(document => <button key={document.id} type="button" disabled={!!busy} aria-pressed={selected?.id === document.id} onClick={() => { setSelected(document); setConfirmed(false); setNotice(''); if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => reviewPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} className={`w-full min-w-0 rounded-xl border p-3 text-left transition-colors ${selected?.id === document.id ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/60'}`}>
            <span title={document.filename} className="block truncate text-sm font-medium">{document.filename}</span>
            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2 py-0.5 capitalize ${document.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : document.status === 'pending' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>{document.status}</span><span className="text-muted-foreground">{document.extraction.items.length} items</span></span>
          </button>)}
          {documents.length < documentTotal && <Button type="button" variant="ghost" className="w-full" disabled={!!busy} onClick={() => void load(documentPage + 1)}>Load more quotations</Button>}
        </div>
      </aside>
      {selected && <div ref={reviewPanel} className="min-w-0 scroll-mt-4 space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="border-b pb-4"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Quotation analysis</p><h3 className="break-words font-semibold">{selected.filename}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.extraction.items.length} extracted items ? {selected.status}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Correct missing or inaccurate details. Publication shares only the fields below with Intorza’s quotation builder, not the original PDF.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{(['location','currency','priceDate','projectType'] as const).map(field => <div key={field} className="space-y-1"><Label htmlFor={`training-${field}`}>{({ location: 'Pricing city', currency: 'Currency (ISO)', priceDate: 'Quotation price date', projectType: 'Project type' })[field]}</Label><Input id={`training-${field}`} type={field === 'priceDate' ? 'date' : 'text'} value={selected.extraction[field] ?? ''} maxLength={field === 'currency' ? 3 : 150} disabled={!!busy} onChange={event => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, [field]: field === 'priceDate' ? event.target.value || null : event.target.value } } : null); }} /></div>)}</div>
        {!!selected.extraction.limitations.length && <details className="rounded-xl bg-muted p-3 text-xs leading-5"><summary className="cursor-pointer">Extraction notes</summary><ul className="mt-2 list-disc pl-4">{selected.extraction.limitations.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
        {selected.extraction.items.map((item, index) => <details key={index} open={index === 0} className="rounded-xl border"><summary className="cursor-pointer p-3 text-sm font-medium">{item.productName} · {item.rate ?? 'Price pending'}/{item.unit} · page {item.page}</summary><div className="space-y-3 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2">{(['section','productName','material','specification','notes'] as const).map(field => <div key={field} className={field === 'specification' || field === 'notes' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}><Label htmlFor={`training-${index}-${field}`}>{({ section: 'Section', productName: 'Product name', material: 'Material', specification: 'Specifications', notes: 'Inclusions and pricing notes' })[field]}</Label><Input id={`training-${index}-${field}`} value={item[field]} maxLength={field === 'section' || field === 'productName' ? 150 : 1000} disabled={!!busy} onChange={event => editItem(index, { [field]: event.target.value })} /></div>)}</div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor={`training-rate-${index}`}>Unit rate</Label><Input id={`training-rate-${index}`} type="number" min="0" max="10000000" value={item.rate ?? ''} disabled={!!busy} onChange={event => editItem(index, { rate: event.target.value ? Number(event.target.value) : null })} /></div><div className="space-y-1"><Label htmlFor={`training-unit-${index}`}>Billing unit</Label><select id={`training-unit-${index}`} value={item.unit} disabled={!!busy} className="h-10 w-full rounded-md border bg-background px-2 text-base" onChange={event => editItem(index, { unit: event.target.value as typeof item.unit })}>{['sqft','sqm','rft','piece','set','lump_sum'].map(unit => <option key={unit}>{unit}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`training-tax-${index}`}>Tax treatment</Label><select id={`training-tax-${index}`} value={item.tax} disabled={!!busy} className="h-10 w-full rounded-md border bg-background px-2 text-base" onChange={event => editItem(index, { tax: event.target.value as typeof item.tax })}>{['excluded','included','unknown'].map(tax => <option key={tax}>{tax}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`training-page-${index}`}>Source page</Label><Input id={`training-page-${index}`} type="number" min="1" max="100" value={item.page} disabled={!!busy} onChange={event => editItem(index, { page: Number(event.target.value) })} /></div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.installationIncluded} disabled={!!busy} onChange={event => editItem(index, { installationIncluded: event.target.checked })} />Installation explicitly included</label>
          <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: current.extraction.items.filter((_, i) => i !== index) } } : null); }}><Trash2 className="mr-1 h-4 w-4" />Remove pattern</Button>
        </div></details>)}
        <Button type="button" variant="outline" size="sm" disabled={!!busy || selected.extraction.items.length >= 60} onClick={() => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: [...current.extraction.items, { section: 'New section', productName: 'New product', material: '', specification: '', unit: 'sqft', quantity: null, rate: null, tax: 'unknown', installationIncluded: false, page: 1, notes: '' }] } } : null); }}><Plus className="mr-1 h-4 w-4" />Add pattern</Button>
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Recommendations combine all comparable approved quotations, using the median and range from the last 90 days. City, currency, material, specifications, installation and tax must match. Conflicting prices require review. Other entries can guide product patterns but remain pending for pricing. Approval never makes a historic quotation a live supplier quote.</p>
        <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1.5" checked={confirmed} disabled={!!busy} onChange={event => setConfirmed(event.target.checked)} />I reviewed the entries, removed customer and confidential information, and approve these references for global Intorza quotation use.</label>
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={!confirmed || !!busy || !selected.extraction.items.length} onClick={() => void review('approve')}><CheckCircle2 className="mr-2 h-4 w-4" />Approve & publish</Button><Button type="button" variant="outline" disabled={!!busy} onClick={() => void review('reject')}>Reject / unpublish</Button></div>
      </div>}
      {!selected && <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-6 text-center"><BookOpen className="mb-3 h-8 w-8 text-muted-foreground" /><h3 className="font-medium">Your quotation analysis appears here</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Upload a PDF above or select a quotation from the library to review its materials and prices.</p></div>}
    </div>
    <details className="group rounded-2xl border bg-card"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5"><span><span className="block font-semibold">Combined price catalogue</span><span className="mt-1 block text-xs text-muted-foreground">Explore prices across all approved quotations</span></span><Plus className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" /></summary><div className="border-t"><AIPriceCatalogue revision={catalogueRevision} /></div></details>
  </section>;
}
