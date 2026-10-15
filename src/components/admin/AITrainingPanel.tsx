'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileUp, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { MAX_PLAN_BYTES } from '@/lib/quotation-ai/floor-plan';
import type { TrainingExtraction } from '@/lib/quotation-ai/training';

type Document = { id: string; filename: string; status: string; extraction: TrainingExtraction; created_at: string };
export function AITrainingPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const pending = useRef(false); const controller = useRef<AbortController | null>(null);
  const api = useCallback(async (body?: FormData | object) => {
    const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error('Please sign in again.');
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 90000);
    try {
      const response = await fetch('/api/admin/ai/training', { method: body ? 'POST' : 'GET', signal: controller.current.signal,
        headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The training request failed.'); return result;
    } finally { clearTimeout(timeout); }
  }, []);
  const load = useCallback(async () => {
    if (pending.current) return; pending.current = true; setBusy('Loading references'); setError('');
    try { const result = await api(); setDocuments(result.documents); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load the library.'); }
    finally { pending.current = false; setBusy(''); }
  }, [api]);
  useEffect(() => { void load(); return () => controller.current?.abort(); }, [load]);
  async function upload() {
    if (!file || pending.current) return;
    if (file.size > MAX_PLAN_BYTES || !/\.pdf$/i.test(file.name)) { setError('Choose a PDF under 10 MB.'); return; }
    pending.current = true; setBusy('Reading quotation materials and prices…'); setError(''); setNotice('');
    try {
      const body = new FormData(); body.append('file', file);
      const result = await api(body); setDocuments(current => [result.document, ...current]); setSelected(result.document); setConfirmed(false); setFile(null);
      setNotice('Extraction ready. Check each entry before publishing it.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not read this PDF.'); }
    finally { pending.current = false; setBusy(''); }
  }
  async function review(action: 'approve' | 'reject') {
    if (!selected || pending.current) return;
    pending.current = true; setBusy(action === 'approve' ? 'Publishing reviewed patterns' : 'Removing published patterns'); setError(''); setNotice('');
    try {
      await api({ id: selected.id, action, extraction: action === 'reject' ? documents.find(row => row.id === selected.id)?.extraction ?? selected.extraction : selected.extraction, confirmAnonymized: confirmed });
      const next = { ...selected, status: action === 'approve' ? 'approved' : 'rejected' };
      setSelected(next); setDocuments(current => current.map(row => row.id === next.id ? next : row));
      setNotice(action === 'approve' ? 'Published. New quotation requests can now use these reviewed references.' : 'Rejected. These patterns are excluded from new quotations.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the review.'); }
    finally { pending.current = false; setBusy(''); }
  }
  function editItem(index: number, patch: Partial<TrainingExtraction['items'][number]>) {
    setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: current.extraction.items.map((item, i) => i === index ? { ...item, ...patch } : item) } } : null);
  }
  return <section className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="h-5 w-5 text-primary" />Train AI</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Teach Intorza your quotation patterns with reviewed PDF references. Approved materials, sections and rates guide future estimates. This adds reference knowledge; it does not retrain the model.</p></div><Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <div className="rounded-2xl border bg-card p-4 sm:p-5"><Label htmlFor="training-pdf" className="text-base font-semibold">Upload a quotation PDF</Label><p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">One PDF, up to 10 MB. Raw documents remain admin-only. Shared references must contain no customer or confidential data.</p><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Input id="training-pdf" type="file" accept=".pdf,application/pdf" className="min-w-0 flex-1" disabled={!!busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); }} /><Button type="button" disabled={!file || !!busy} onClick={() => void upload()}><FileUp className="mr-2 h-4 w-4" />Analyse quotation</Button></div></div>
    {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p>}
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="space-y-2"><h3 className="text-sm font-semibold">Reference library · {documents.length}</h3>{!documents.length && !busy && <p className="text-sm text-muted-foreground">No quotation PDFs yet.</p>}{documents.map(document => <button key={document.id} type="button" disabled={!!busy} onClick={() => { setSelected(document); setConfirmed(false); setNotice(''); }} className={`w-full rounded-xl border p-3 text-left ${selected?.id === document.id ? 'border-primary bg-primary/5' : 'bg-card'}`}><span className="block break-words text-sm font-medium">{document.filename}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{document.status} · {document.extraction.items.length} patterns</span></button>)}</div>
      {selected && <div className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div><h3 className="break-words font-semibold">Review extracted patterns</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Correct missing or inaccurate details. Publication shares only the fields below with Intorza’s quotation builder, not the original PDF.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{(['location','currency','priceDate','projectType'] as const).map(field => <div key={field} className="space-y-1"><Label htmlFor={`training-${field}`}>{({ location: 'Pricing city', currency: 'Currency (ISO)', priceDate: 'Quotation price date', projectType: 'Project type' })[field]}</Label><Input id={`training-${field}`} type={field === 'priceDate' ? 'date' : 'text'} value={selected.extraction[field] ?? ''} maxLength={field === 'currency' ? 3 : 150} disabled={!!busy} onChange={event => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, [field]: field === 'priceDate' ? event.target.value || null : event.target.value } } : null); }} /></div>)}</div>
        {!!selected.extraction.limitations.length && <details className="rounded-xl bg-muted p-3 text-xs leading-5"><summary className="cursor-pointer">Extraction notes</summary><ul className="mt-2 list-disc pl-4">{selected.extraction.limitations.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
        {selected.extraction.items.map((item, index) => <details key={index} open={index === 0} className="rounded-xl border"><summary className="cursor-pointer p-3 text-sm font-medium">{item.productName} · {item.rate ?? 'Price pending'}/{item.unit} · page {item.page}</summary><div className="space-y-3 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-2">{(['section','productName','material','specification','notes'] as const).map(field => <div key={field} className={field === 'specification' || field === 'notes' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}><Label htmlFor={`training-${index}-${field}`}>{({ section: 'Section', productName: 'Product name', material: 'Material', specification: 'Specifications', notes: 'Inclusions and pricing notes' })[field]}</Label><Input id={`training-${index}-${field}`} value={item[field]} maxLength={field === 'section' || field === 'productName' ? 150 : 1000} disabled={!!busy} onChange={event => editItem(index, { [field]: event.target.value })} /></div>)}</div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor={`training-rate-${index}`}>Unit rate</Label><Input id={`training-rate-${index}`} type="number" min="0" max="10000000" value={item.rate ?? ''} disabled={!!busy} onChange={event => editItem(index, { rate: event.target.value ? Number(event.target.value) : null })} /></div><div className="space-y-1"><Label htmlFor={`training-unit-${index}`}>Billing unit</Label><select id={`training-unit-${index}`} value={item.unit} disabled={!!busy} className="h-10 w-full rounded-md border bg-background px-2 text-base" onChange={event => editItem(index, { unit: event.target.value as typeof item.unit })}>{['sqft','sqm','rft','piece','set','lump_sum'].map(unit => <option key={unit}>{unit}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`training-tax-${index}`}>Tax treatment</Label><select id={`training-tax-${index}`} value={item.tax} disabled={!!busy} className="h-10 w-full rounded-md border bg-background px-2 text-base" onChange={event => editItem(index, { tax: event.target.value as typeof item.tax })}>{['excluded','included','unknown'].map(tax => <option key={tax}>{tax}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`training-page-${index}`}>Source page</Label><Input id={`training-page-${index}`} type="number" min="1" max="100" value={item.page} disabled={!!busy} onChange={event => editItem(index, { page: Number(event.target.value) })} /></div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.installationIncluded} disabled={!!busy} onChange={event => editItem(index, { installationIncluded: event.target.checked })} />Installation explicitly included</label>
          <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: current.extraction.items.filter((_, i) => i !== index) } } : null); }}><Trash2 className="mr-1 h-4 w-4" />Remove pattern</Button>
        </div></details>)}
        <Button type="button" variant="outline" size="sm" disabled={!!busy || selected.extraction.items.length >= 60} onClick={() => { setConfirmed(false); setSelected(current => current ? { ...current, extraction: { ...current.extraction, items: [...current.extraction.items, { section: 'New section', productName: 'New product', material: '', specification: '', unit: 'sqft', quantity: null, rate: null, tax: 'unknown', installationIncluded: false, page: 1, notes: '' }] } } : null); }}><Plus className="mr-1 h-4 w-4" />Add pattern</Button>
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Only recent (90-day), city/currency-matched, installed, GST-exclusive square-foot rates are used automatically. Other entries can guide product patterns but remain pending for pricing. Approval never makes a historic quotation a live supplier quote.</p>
        <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1.5" checked={confirmed} disabled={!!busy} onChange={event => setConfirmed(event.target.checked)} />I reviewed the entries, removed customer and confidential information, and approve these references for global Intorza quotation use.</label>
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={!confirmed || !!busy || !selected.extraction.items.length} onClick={() => void review('approve')}><CheckCircle2 className="mr-2 h-4 w-4" />Approve & publish</Button><Button type="button" variant="outline" disabled={!!busy} onClick={() => void review('reject')}>Reject / unpublish</Button></div>
      </div>}
    </div>
  </section>;
}
