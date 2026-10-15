'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, FilePenLine, ImageUp, Loader2, Plus, ScanLine, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientSelector } from './ClientSelector';
import { supabase } from '@/integrations/supabase/client';
import { MAX_PLAN_BYTES, MAX_PLAN_FILES, scopedRooms, type PlanAnalysis, type ProjectBrief, type Estimate } from '@/lib/quotation-ai/floor-plan';
import { itemCalculation, type VoiceDraft } from '@/lib/quotation-ai/domain';

export type BuilderMode = 'upload' | 'details';
type Props = {
  mode: BuilderMode | null; onStart: (mode: BuilderMode) => void; onClose: () => void;
  getCurrentDraft: () => VoiceDraft;
  onApply: (draft: VoiceDraft, base: string, projectId: string, saveDraft?: boolean) => void;
  clients: { id: string; name: string; address: string | null }[];
};
type Step = 'upload' | 'analysis' | 'scope' | 'finish' | 'budget' | 'details' | 'review' | 'estimate';
const emptyAnalysis: PlanAnalysis = { propertyType: 'Residential interior', floors: null, units: 'Not supplied', scale: 'Not supplied', rooms: [], warnings: ['No floor plan supplied. Work measurements require confirmation.'] };
const scopes = [{ value: 'complete', title: 'Complete home', detail: 'All rooms in your plan' }, { value: 'kitchen-wardrobes', title: 'Kitchen & wardrobes', detail: 'Kitchen cabinetry and bedroom storage' }, { value: 'living-bedrooms', title: 'Living room & bedrooms', detail: 'Focus on everyday spaces' }, { value: 'selected', title: 'Choose specific rooms', detail: 'Include only the spaces you need' }] as const;
const titles: Record<Step, string> = { upload: 'Upload your floor plan', analysis: 'Your property analysis', scope: 'What would you like to design?', finish: 'Choose your finish level', budget: 'Do you have a target budget?', details: 'Who is this project for?', review: 'Ready to build your estimate', estimate: 'Your quotation is ready to review' };
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const next = URL.createObjectURL(file); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? <img src={url} alt="Selected floor plan" className="h-12 w-12 shrink-0 rounded-lg border bg-white object-contain" /> : <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />;
}

export function FloorPlanQuotationBuilder({ mode, onStart, onClose, getCurrentDraft, onApply, clients }: Props) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [step, setStep] = useState<Step>(mode === 'details' ? 'analysis' : 'upload');
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<PlanAnalysis>(emptyAnalysis);
  const [brief, setBrief] = useState<ProjectBrief>({ scope: 'complete', roomNames: [], finish: 'Standard', budget: null, clientName: '', location: '', address: '' });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [regenerateRooms, setRegenerateRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const base = useRef('');
  const picker = useRef<HTMLInputElement>(null);
  const abort = useRef<(() => void) | null>(null);
  const pending = useRef(false);
  useEffect(() => () => abort.current?.(), []);
  useEffect(() => { if (mode === 'details') setStep(current => current === 'upload' ? 'analysis' : current); }, [mode]);
  const start = (next: BuilderMode) => {
    setChooserOpen(false);
    let draft: VoiceDraft;
    try { draft = getCurrentDraft(); } catch { onStart(next); return; }
    setBrief({ scope: 'complete', roomNames: [], finish: 'Standard', budget: null, clientName: draft.project.clientName, location: draft.project.placeOfProject, address: draft.project.clientAddress });
    setFiles([]); setAnalysis(emptyAnalysis); setProjectId(null); setEstimate(null); setRegenerateRooms([]); setError('');
    setStep(next === 'upload' ? 'upload' : 'analysis'); onStart(next);
  };
  function selectFiles(incoming: File[]) {
    const next = [...files, ...incoming];
    if (next.length > MAX_PLAN_FILES || next.reduce((sum, file) => sum + file.size, 0) > MAX_PLAN_BYTES) { setError('Choose up to 3 files, no more than 10 MB in total.'); return; }
    if (next.some(file => !/\.(pdf|jpe?g|png|webp)$/i.test(file.name))) { setError('Choose PDF, JPG, PNG or WEBP files.'); return; }
    setFiles(next); setError('');
  }
  async function token() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Please sign in again. Your answers are kept here.');
    return data.session.access_token;
  }
  async function analyse() {
    if (pending.current || !files.length) return;
    pending.current = true; setBusy('Uploading your plans'); setError(''); setProgress(0);
    let cancelled = false;
    abort.current = () => { cancelled = true; };
    try {
      const accessToken = await token();
      if (cancelled) throw new Error('Upload cancelled.');
      const form = new FormData(); files.forEach(file => form.append('files', file));
      const result = await new Promise<{ analysis: PlanAnalysis; projectId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); abort.current = () => xhr.abort();
        xhr.open('POST', '/api/quotation-ai/floor-plan'); xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`); xhr.timeout = 90000;
        xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        xhr.upload.onload = () => { setProgress(100); setBusy('Analysing rooms and dimensions'); };
        xhr.onerror = () => reject(new Error('Connection lost. Your files are still selected; try again.'));
        xhr.ontimeout = () => reject(new Error('Analysis took too long. Try a smaller plan.'));
        xhr.onabort = () => reject(new Error('Upload cancelled.'));
        xhr.onload = () => { try { const body = JSON.parse(xhr.responseText); if (xhr.status < 200 || xhr.status >= 300) throw new Error(body.error || 'Analysis failed.'); resolve(body); } catch (failure) { reject(failure); } };
        xhr.send(form);
      });
      setAnalysis(result.analysis); setProjectId(result.projectId); setBrief(value => ({ ...value, roomNames: result.analysis.rooms.map(room => room.name) })); setStep('analysis');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not analyse the plan.'); }
    finally { pending.current = false; setBusy(''); abort.current = null; }
  }
  async function generate(selected?: string[]) {
    if (pending.current) return;
    pending.current = true; setBusy('Preparing your editable estimate'); setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    abort.current = () => controller.abort();
    try {
      const draft = getCurrentDraft();
      if (selected && JSON.stringify(draft) !== base.current) throw new Error('The editor changed. Go Back and generate a new estimate to preserve your edits.');
      base.current = JSON.stringify(draft);
      const response = await fetch('/api/quotation-ai/floor-plan', { method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', projectId, analysis, brief, draft, ...(selected ? { regenerateRooms: selected } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not generate an estimate.');
      setEstimate(body.estimate); setProjectId(body.projectId); setRegenerateRooms([]); setStep('estimate');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not generate an estimate.'); }
    finally { clearTimeout(timeout); pending.current = false; setBusy(''); abort.current = null; }
  }
  const back = () => { setError(''); setStep(({ upload: 'upload', analysis: mode === 'upload' ? 'upload' : 'analysis', scope: 'analysis', finish: 'scope', budget: 'finish', details: 'budget', review: 'details', estimate: 'review' } as Record<Step, Step>)[step]); };
  const next = () => {
    setError('');
    if (step === 'analysis') {
      if (!analysis.rooms.length || analysis.rooms.some(room => !room.name.trim()) || new Set(analysis.rooms.map(room => room.name)).size !== analysis.rooms.length) { setError('Add at least one room, with a different name for each room.'); return; }
      setBrief(value => ({ ...value, roomNames: analysis.rooms.map(room => room.name) })); setStep('scope');
    } else if (step === 'scope') {
      if (!scopedRooms(analysis, brief).length) { setError('Choose at least one room that matches this scope.'); return; }
      setStep('finish');
    } else if (step === 'finish') setStep('budget');
    else if (step === 'budget') setStep('details');
    else if (step === 'details') { if (!brief.clientName.trim() || !brief.location.trim()) { setError('Enter the client name and project city.'); return; } setStep('review'); }
  };
  const updateRoom = (index: number, value: Partial<PlanAnalysis['rooms'][number]>) => setAnalysis(current => ({ ...current, rooms: current.rooms.map((room, i) => i === index ? { ...room, ...value } : room) }));
  const groups = ['upload', 'analysis'].includes(step) ? 0 : ['scope', 'finish', 'budget'].includes(step) ? 1 : step === 'details' ? 2 : 3;
  return <>
    <div className="flex min-w-0 justify-end">
      <Button type="button" className="w-full gap-2 rounded-xl shadow-sm sm:w-auto" onClick={() => setChooserOpen(true)}><Sparkles className="h-4 w-4" aria-hidden="true" />Built with AI<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
    </div>
    <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
      <DialogContent className="max-h-[90dvh] min-w-0 max-w-lg overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle className="text-lg">Build your quotation with AI</DialogTitle>
          <DialogDescription className="text-sm">Start with a floor plan or a few project details.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 grid-cols-2 gap-2.5 pt-1 sm:gap-3" aria-label="AI quotation tools">
          {[{ mode: 'upload' as const, icon: ImageUp, badge: ScanLine, title: 'Floor Plan Analysis', description: 'Scan your plan into an editable estimate.', action: 'Upload Floor Plan', meta: 'PDF · JPG · PNG · WEBP' },
            { mode: 'details' as const, icon: FilePenLine, badge: Sparkles, title: 'AI Quotation Builder', description: 'Turn project details into a quotation.', action: 'Generate Quotation', meta: 'No floor plan needed' }].map(card => <button key={card.mode} type="button" aria-label={card.action} onClick={() => start(card.mode)} className="group flex min-w-0 flex-col items-start rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-4">
              <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary sm:h-14 sm:w-14"><card.icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.6} aria-hidden="true" /><span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-background bg-primary text-primary-foreground"><card.badge className="h-3 w-3" aria-hidden="true" /></span></div>
              <span className="break-words text-sm font-semibold leading-5">{card.title}</span>
              <span className="mt-1.5 break-words text-xs leading-5 text-muted-foreground">{card.description}</span>
              <span className="mb-4 mt-2 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">{card.meta}</span>
              <span className="mt-auto flex w-full items-center justify-between gap-1 border-t pt-2.5 text-xs font-medium text-primary"><span>{card.mode === 'upload' ? 'Upload plan' : 'Get started'}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
            </button>)}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={mode !== null} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] min-w-0 max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-6 text-left sm:px-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Intorza · Project studio</p>
          <DialogTitle className="pr-5 text-xl leading-7">{titles[step]}</DialogTitle>
          <DialogDescription className="text-sm leading-6">{step === 'upload' ? "We'll analyse the layout, identify rooms and dimensions, and ask only essential questions." : step === 'estimate' ? 'AI-generated estimate — review required. You control what is saved and shared.' : 'A few simple steps. Every detail stays editable.'}</DialogDescription>
          <div className="!mt-4 flex gap-1.5" aria-label={`Step ${groups + 1} of 4`}>{['Property', 'Scope', 'Client', 'Review'].map((name, index) => <div key={name} className="min-w-0 flex-1"><div className={`h-1 rounded-full ${index <= groups ? 'bg-primary' : 'bg-muted'}`} /><span className="mt-1 block text-[11px] text-muted-foreground">{name}</span></div>)}</div>
        </DialogHeader>
        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 [overflow-wrap:anywhere] sm:px-6">
          {step === 'upload' && <>
            <div className={`rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) selectFiles(Array.from(event.dataTransfer.files)); }}>
              <UploadCloud className="mx-auto mb-3 h-9 w-9 text-primary" /><p className="font-medium">Drop your floor plan here</p><p className="mb-4 mt-1 text-sm text-muted-foreground">Or choose files from your device</p>
              <input ref={picker} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" aria-label="Floor plan files" onChange={event => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} disabled={!!busy} />
              <Button type="button" variant="outline" onClick={() => picker.current?.click()} disabled={!!busy}>Browse files</Button>
              <p className="mt-4 text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · Up to 3 files · 10 MB total<br />Multi-page PDFs supported. Clear dimension labels work best.</p>
            </div>
            {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border p-3"><FilePreview file={file} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.name.split('.').pop()?.toUpperCase()}</p></div><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${file.name}`} disabled={!!busy} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
            <p className="text-xs leading-5 text-muted-foreground">Your drawings are stored privately and analysed only for your project.</p>
          </>}
          {step === 'analysis' && <>
            <div className="grid grid-cols-2 gap-3"><label className="col-span-2 space-y-1 text-sm">Property type<Input value={analysis.propertyType} onChange={event => setAnalysis(current => ({ ...current, propertyType: event.target.value }))} maxLength={150} /></label><label className="space-y-1 text-sm">Floors<Input type="number" min="1" max="30" placeholder="Unknown" value={analysis.floors ?? ''} onChange={event => setAnalysis(current => ({ ...current, floors: event.target.value ? Math.max(1, Math.min(30, Number(event.target.value))) : null }))} /></label><div className="self-end rounded-lg bg-muted p-2 text-xs text-muted-foreground">{analysis.rooms.length} rooms<br />{analysis.units}</div></div>
            {!!analysis.warnings.length && <details className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100"><summary className="cursor-pointer font-medium">{analysis.warnings.length} measurement note{analysis.warnings.length === 1 ? '' : 's'} to review</summary><ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-4">{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
            {analysis.rooms.map((room, index) => <div key={index} className="space-y-3 rounded-xl border p-3">
              <div className="flex min-w-0 items-center gap-2"><Input aria-label={`Room ${index + 1} name`} value={room.name} maxLength={150} onChange={event => updateRoom(index, { name: event.target.value })} className="min-w-0 flex-1" /><Button size="icon" variant="ghost" type="button" aria-label={`Remove room ${index + 1}`} onClick={() => setAnalysis(current => ({ ...current, rooms: current.rooms.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid grid-cols-3 gap-2"><label className="space-y-1 text-xs">Room type<select value={room.kind} className="h-10 w-full min-w-0 rounded-md border bg-background px-1 text-base" onChange={event => updateRoom(index, { kind: event.target.value as typeof room.kind })}>{['bedroom','bathroom','kitchen','living','dining','balcony','utility','study','other'].map(kind => <option key={kind}>{kind}</option>)}</select></label>{(['widthFt', 'lengthFt'] as const).map((field, i) => <label key={field} className="space-y-1 text-xs">{i ? 'Length (ft)' : 'Width (ft)'}<Input type="number" min="0.01" max="100000" step="any" placeholder="Unknown" value={room[field] ?? ''} onChange={event => updateRoom(index, { [field]: event.target.value ? Number(event.target.value) : null, source: 'user', confidence: 'high' })} /></label>)}</div>
              <p className="text-xs text-muted-foreground">{room.source === 'printed' ? 'Printed dimension' : room.source === 'user' ? 'Entered by you' : 'Requires measurement'} · {room.confidence} confidence{room.file && ` · ${room.file}, page ${room.page}`}</p>{room.notes && <p className="text-xs leading-5 text-muted-foreground">{room.notes}</p>}
            </div>)}
            <Button variant="outline" type="button" className="w-full gap-2" disabled={analysis.rooms.length >= 40} onClick={() => setAnalysis(current => ({ ...current, rooms: [...current.rooms, { name: `Room ${current.rooms.length + 1}`, kind: 'other', floor: '1', widthFt: null, lengthFt: null, source: 'user', confidence: 'high', file: '', page: 1, notes: '' }] }))}><Plus className="h-4 w-4" />Add room</Button>
          </>}
          {step === 'scope' && <>
            <div className="grid gap-2 sm:grid-cols-2">{scopes.map(scope => <button type="button" key={scope.value} aria-pressed={brief.scope === scope.value} onClick={() => setBrief(current => ({ ...current, scope: scope.value }))} className={`rounded-xl border p-4 text-left ${brief.scope === scope.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}`}><span className="block text-sm font-medium">{scope.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{scope.detail}</span></button>)}</div>
            {brief.scope === 'selected' && <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Choose your rooms</legend>{analysis.rooms.map(room => <label key={room.name} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={brief.roomNames.includes(room.name)} onChange={event => setBrief(current => ({ ...current, roomNames: event.target.checked ? [...current.roomNames, room.name] : current.roomNames.filter(name => name !== room.name) }))} />{room.name}</label>)}</fieldset>}
          </>}
          {step === 'finish' && <div className="space-y-2">{(['Budget-friendly', 'Standard', 'Premium', 'Luxury', 'Recommend'] as const).map(finish => <button key={finish} type="button" aria-pressed={brief.finish === finish} onClick={() => setBrief(current => ({ ...current, finish }))} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm ${brief.finish === finish ? 'border-primary bg-primary/5' : ''}`}>{finish === 'Recommend' ? 'Recommend based on my budget' : finish}{brief.finish === finish && <Check className="h-4 w-4 text-primary" />}</button>)}</div>}
          {step === 'budget' && <><p className="text-sm text-muted-foreground">Optional. Leave this empty to start with the available product rates.</p><Label htmlFor="plan-budget">Approximate budget</Label><Input id="plan-budget" inputMode="decimal" type="number" min="1" max="1000000000" placeholder="No budget set" value={brief.budget ?? ''} onChange={event => setBrief(current => ({ ...current, budget: event.target.value ? Number(event.target.value) : null }))} /></>}
          {step === 'details' && <><div className="space-y-2"><Label>Client name</Label><ClientSelector value={brief.clientName} clients={clients} onChange={clientName => setBrief(current => ({ ...current, clientName }))} onClientSelect={client => setBrief(current => ({ ...current, address: client.address || current.address }))} /></div><div className="space-y-2"><Label htmlFor="plan-location">Project city or location</Label><Input id="plan-location" value={brief.location} maxLength={150} placeholder="e.g. Bengaluru" onChange={event => setBrief(current => ({ ...current, location: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="plan-address">Address (optional)</Label><Input id="plan-address" value={brief.address} maxLength={1000} onChange={event => setBrief(current => ({ ...current, address: event.target.value }))} /></div></>}
          {step === 'review' && <><dl className="space-y-3 rounded-xl border p-4 text-sm">{[['Property', `${analysis.propertyType} · ${analysis.floors ?? 'Unknown'} floor(s)`], ['Rooms included', scopedRooms(analysis, brief).map(room => room.name).join(', ')], ['Finish', brief.finish], ['Client', brief.clientName], ['Location', brief.location], ['Budget', brief.budget?.toLocaleString() || 'Not set']].map(([name, value]) => <div key={name} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{name}</dt><dd>{value}</dd></div>)}</dl><p className="rounded-xl bg-muted p-3 text-xs leading-5">Pricing uses your business's approved rates where available, then labelled historical rates. No live supplier integration is configured. Missing prices and work measurements stay marked for review. Your current editor content will be preserved.</p></>}
          {step === 'estimate' && estimate && <>
            <div className="rounded-xl bg-primary/5 p-4"><p className="text-xs font-medium text-primary">AI-generated estimate · review required</p><p className="mt-1 text-2xl font-semibold">{estimate.totals.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">{estimate.evidence.find(item => item.price)?.price?.currency || ''}</span></p><p className="mt-1 text-xs text-muted-foreground">{estimate.incomplete ? 'Partial total: excludes items with missing quantity or rate.' : 'Includes your existing tax and discount settings.'}</p></div>
            {estimate.draft.sections.map(section => <div key={section.id} className="overflow-hidden rounded-xl border"><h3 className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">{section.title}</h3>{section.items.map(item => { const evidence = estimate.evidence.find(row => row.itemId === item.id); const amount = itemCalculation(item); return <div key={item.id} className="space-y-1 border-b p-3 last:border-0"><p className="text-sm font-medium">{item.productName}</p><p className="text-xs leading-5 text-muted-foreground">{item.productDetails}</p><p className="text-sm">{item.sftArea ?? '?'} sqft × {item.ratePerSft ?? '?'} = {amount.cents == null ? 'Pending' : (Number(amount.cents) / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">{evidence?.quantityStatus === 'unknown' ? 'Requires measurement' : `${evidence?.quantityStatus} quantity`} · {evidence?.price ? evidence.price.source === 'approved' ? 'Rate from approved catalogue' : 'Historical rate — verify' : 'Requires supplier confirmation'}</p>{evidence?.reason && <p className="text-xs text-muted-foreground">{evidence.reason}</p>}{evidence?.price && <p className="text-xs text-muted-foreground">Last recorded: {evidence.price.verifiedAt.slice(0, 10)} · {evidence.price.inclusions}</p>}</div>; })}</div>)}
            <details className="rounded-xl border p-3 text-xs leading-5"><summary className="cursor-pointer font-medium">Assumptions & exclusions</summary><ul className="mt-2 list-disc space-y-1 pl-4">{estimate.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
            <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">Refine this estimate</summary><fieldset className="mt-3 space-y-2"><legend className="mb-2 text-xs text-muted-foreground">Select rooms to regenerate. Other rooms stay in this estimate.</legend>{[...new Set(estimate.roomSections.map(row => row.roomName))].map(name => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={regenerateRooms.includes(name)} onChange={event => setRegenerateRooms(current => event.target.checked ? [...current, name] : current.filter(room => room !== name))} />{name}</label>)}</fieldset><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!regenerateRooms.length || !!busy} onClick={() => void generate(regenerateRooms)}>Regenerate selected items</Button><Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={() => setStep('details')}>Edit Project Details</Button></div></details>
            <p className="text-xs text-muted-foreground">Open the editor to adjust products, measurements and rates, then use Save as Draft. Nothing is sent automatically.</p>
          </>}
          {busy && <div role="status" className="space-y-2 rounded-xl bg-muted p-3"><div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{busy}</div>{step === 'upload' && <progress aria-label="Upload progress" value={progress} max={100} className="h-1.5 w-full accent-primary" />}</div>}
          {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {busy ? <Button variant="outline" type="button" onClick={() => abort.current?.()}>Cancel request</Button> : <>
            <Button variant="outline" type="button" onClick={step === 'upload' || step === 'analysis' && mode === 'details' ? onClose : back}><ArrowLeft className="mr-1 h-4 w-4" />{step === 'upload' || step === 'analysis' && mode === 'details' ? 'Cancel' : 'Back'}</Button>
            {step === 'upload' ? <Button type="button" className="min-w-0 flex-1" disabled={!files.length} onClick={() => void analyse()}>Analyse Floor Plan</Button> : step === 'review' ? <Button type="button" className="min-w-0 flex-1" onClick={() => void generate()}>Generate Quotation</Button> : step === 'estimate' ? <>
              <Button type="button" variant="outline" className="min-w-0 flex-1" onClick={() => { try { if (estimate && projectId) { onApply(estimate.draft, base.current, projectId); onClose(); } } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not apply the estimate.'); } }}>Edit Quotation</Button>
              <Button type="button" className="w-full sm:w-auto" onClick={() => { try { if (estimate && projectId) { onApply(estimate.draft, base.current, projectId, true); onClose(); } } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the estimate.'); } }}>Save as Draft</Button>
            </> : <Button type="button" className="min-w-0 flex-1" onClick={next}>Continue<ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
