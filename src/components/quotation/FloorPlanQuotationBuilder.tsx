'use client';

import { AI_COIN_COSTS } from '@/lib/ai-coin-costs';

import { AI_SERVICE_ISSUE } from '@/lib/quotation-ai/service-issue';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, LockKeyhole, Plus, Trash2, UploadCloud } from 'lucide-react';
import { BuilderArtwork, BuilderMark, GoldCoin } from './AIBuilderVisuals';
import { FloorPlanEstimateOverview } from './FloorPlanEstimateOverview';
import { CompleteEstimate } from './CompleteEstimate';
import { RoomWorkQuestions } from './RoomWorkQuestions';
import { QuickPlanScope } from './QuickPlanScope';
import { PlanScopeQuestions } from './PlanScopeQuestions';
import { DesignIntentQuestions } from './DesignIntentQuestions';
import { defaultRoomWork, roomWorkOptions } from '@/lib/quotation-ai/room-work';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientSelector } from './ClientSelector';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { MAX_PLAN_BYTES, MAX_PLAN_FILES, scopedRooms, type PlanAnalysis, type ProjectBrief, type Estimate } from '@/lib/quotation-ai/floor-plan';
import { type VoiceDraft } from '@/lib/quotation-ai/domain';

export type BuilderMode = 'upload' | 'details';
type Props = {
  mode: BuilderMode | null; onStart: (mode: BuilderMode) => void; onClose: () => void;
  getCurrentDraft: () => VoiceDraft;
  onApply: (draft: VoiceDraft, base: string, projectId: string, saveDraft?: boolean, evidence?: Estimate['evidence']) => void;
  clients: { id: string; name: string; address: string | null }[];
  onMeasurementSystemChange?: () => void;
};
type Step = 'upload' | 'analysis' | 'scope' | 'work' | 'design' | 'finish' | 'budget' | 'details' | 'review' | 'estimate';
const emptyAnalysis: PlanAnalysis = { propertyType: 'Residential interior', floors: null, units: 'Not supplied', scale: 'Not supplied', rooms: [], warnings: ['No floor plan supplied. Work measurements require confirmation.'] };
// Keep displayed prices aligned with the AI endpoint.
const creditDisplay = { upload: AI_COIN_COSTS.floor_plan, details: AI_COIN_COSTS.ai_builder } as const;
const scopes = [{ value: 'complete', title: 'Full Interior', detail: 'Cabinetry, ceiling and wall painting across your plan' }, { value: 'modular', title: 'Modular interiors', detail: 'Room-specific cabinetry and storage' }, { value: 'kitchen', title: 'Kitchen', detail: 'Only kitchens detected in your plan' }, { value: 'bedrooms', title: 'Bedrooms', detail: 'Bedroom interiors in your plan' }, { value: 'kitchen-wardrobes', title: 'Kitchen & wardrobes', detail: 'Kitchen cabinetry and bedroom storage' }, { value: 'living-bedrooms', title: 'Living room & bedrooms', detail: 'Focus on everyday spaces' }, { value: 'selected', title: 'Choose specific rooms', detail: 'Include only the spaces you need' }] as const;
const titles: Record<Step, string> = { upload: 'Upload your floor plan', analysis: 'Your property analysis', scope: 'What would you like to design?', work: 'Confirm the work in each room', design: 'Set your design direction', finish: 'Choose your finish level', budget: 'Do you have a target budget?', details: 'Who is this project for?', review: 'Ready to build your estimate', estimate: 'Your quotation is ready to review' };
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const next = URL.createObjectURL(file); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? <img src={url} alt="Selected floor plan" className="h-12 w-12 shrink-0 rounded-lg border bg-white object-contain" /> : <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />;
}

export function FloorPlanQuotationBuilder({ mode, onStart, onClose, getCurrentDraft, onApply, clients, onMeasurementSystemChange }: Props) {
  const { isPro, loading: proLoading, status: proStatus, refreshSubscription, setPaywallOpen } = useSubscription();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [step, setStep] = useState<Step>(mode === 'details' ? 'analysis' : 'upload');
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<PlanAnalysis>(emptyAnalysis);
  const [homeType, setHomeType] = useState<'Studio' | '1 BHK' | '2 BHK' | '3 BHK' | '4 BHK'>('2 BHK');
  const [brief, setBrief] = useState<ProjectBrief>({ scope: 'complete', roomNames: [], finish: 'Standard', budget: null, clientName: '', location: '', address: '' });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [walletChecking, setWalletChecking] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const topUpShown = useRef(false);
  const walletRead = useRef(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [workRoomIndex, setWorkRoomIndex] = useState(0);
  const [wholePlan, setWholePlan] = useState<boolean | null>(null);
  const [regenerateRooms, setRegenerateRooms] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [measurementChanged, setMeasurementChanged] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [invalidWorkKey, setInvalidWorkKey] = useState('');
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [dragging, setDragging] = useState(false);
  const base = useRef('');
  const picker = useRef<HTMLInputElement>(null);
  const abort = useRef<(() => void) | null>(null);
  const pending = useRef(false);
  const scrollPanel = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const busyBanner = useRef<HTMLDivElement>(null);
  const errorBanner = useRef<HTMLDivElement>(null);
  const detailPlan = (type: typeof homeType): PlanAnalysis => {
    const bedrooms = type === 'Studio' ? 0 : Number(type[0]);
    const kinds: PlanAnalysis['rooms'][number]['kind'][] = ['living', 'kitchen', ...Array.from({ length: bedrooms }, () => 'bedroom' as const), ...Array.from({ length: Math.max(1, bedrooms) }, () => 'bathroom' as const), ...(bedrooms >= 2 ? ['dining' as const] : [])];
    const labels: Record<PlanAnalysis['rooms'][number]['kind'], string> = { living: 'Living room', kitchen: 'Kitchen', bedroom: 'Bedroom', bathroom: 'Bathroom', dining: 'Dining room', balcony: 'Balcony', utility: 'Utility', study: 'Study', other: 'Room' };
    const count: Record<string, number> = {};
    return { propertyType: `${type} residential interior`, floors: 1, units: 'Not supplied', scale: 'Not supplied', warnings: ['Room dimensions were not supplied. The AI uses conservative work-face allowances that remain editable.'], rooms: kinds.map((kind, index) => {
      count[kind] = (count[kind] ?? 0) + 1;
      return { name: `${labels[kind]}${['bedroom', 'bathroom'].includes(kind) ? ` ${count[kind]}` : ''}`, kind, floor: '1', widthFt: null, lengthFt: null, source: 'unknown', confidence: 'medium', file: 'Home type selected', page: index + 1, notes: '' };
    }) };
  };
  const refreshWalletBalance = async (): Promise<number | null> => {
    const read = ++walletRead.current;
    setWalletChecking(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { if (read === walletRead.current) setWalletBalance(null); return null; }
      const { data, error: walletError } = await supabase.from('coin_wallets').select('balance').eq('user_id', user.id).maybeSingle();
      if (walletError || !data || !Number.isInteger(data.balance)) { if (read === walletRead.current) setWalletBalance(null); return null; }
      if (read === walletRead.current) setWalletBalance(data.balance);
      return data.balance;
    } catch { if (read === walletRead.current) setWalletBalance(null); return null; }
    finally { if (read === walletRead.current) setWalletChecking(false); }
  };
  const requireCoins = async (cost: number) => {
    const balance = await refreshWalletBalance();
    if (balance === null) throw new Error('Could not check your coin balance. Please retry before starting AI.');
    if (balance < cost) { setTopUpOpen(true); throw new Error(`Insufficient coins. You need ${cost} coins; your balance is ${balance}. Top up ${cost - balance} coins to continue.`); }
  };
  const requiredCoins = mode === 'upload' && step === 'upload' ? AI_COIN_COSTS.floor_plan : mode === 'details' && !projectId ? AI_COIN_COSTS.ai_builder : 0;
  const coinsReady = requiredCoins === 0 || (!walletChecking && walletBalance !== null && walletBalance >= requiredCoins);
  useEffect(() => { topUpShown.current = false; setTopUpOpen(false); }, [mode]);
  useEffect(() => {
    if (!mode || walletChecking || walletBalance === null || !requiredCoins) return;
    if (walletBalance >= requiredCoins) { setTopUpOpen(false); setError(current => /insufficient coins/i.test(current) ? '' : current); return; }
    if (!topUpShown.current) { topUpShown.current = true; setTopUpOpen(true); }
  }, [mode, walletChecking, walletBalance, requiredCoins]);
  useEffect(() => {
    if (!mode) return;
    const frame = requestAnimationFrame(() => {
      if (scrollPanel.current) scrollPanel.current.scrollTop = 0;
      stepHeading.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, step, workRoomIndex]);
  useEffect(() => { if (busy) busyBanner.current?.focus({ preventScroll: true }); }, [busy]);
  useEffect(() => {
    if (!error) return;
    const panel = scrollPanel.current;
    const question = invalidWorkKey ? panel?.querySelector<HTMLElement>(`[data-work-key="${invalidWorkKey}"]`) : null;
    if (panel && question) {
      panel.scrollTop += question.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16;
      question.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    } else errorBanner.current?.focus({ preventScroll: true });
  }, [error, invalidWorkKey, validationAttempt]);
  useEffect(() => () => abort.current?.(), []);
  useEffect(() => {
    void refreshWalletBalance();
    const update = () => void refreshWalletBalance();
    window.addEventListener('intorza:wallet-changed', update);
    return () => window.removeEventListener('intorza:wallet-changed', update);
  }, [mode]);
  useEffect(() => { if (mode === 'details') setStep(current => current === 'upload' ? 'analysis' : current); }, [mode]);
  useEffect(() => { if (proLoading || !isPro) setChooserOpen(false); }, [proLoading, isPro]);
  const start = (next: BuilderMode) => {
    if (proLoading) return;
    if (!isPro) { setChooserOpen(false); setPaywallOpen(true, 'Build with AI'); return; }
    setChooserOpen(false);
    let draft: VoiceDraft;
    try { draft = getCurrentDraft(); } catch { onStart(next); return; }
    setBrief({ scope: 'complete', roomNames: [], finish: 'Standard', budget: null, clientName: draft.project.clientName, location: draft.project.placeOfProject, address: draft.project.clientAddress });
    setFiles([]); setAnalysis(emptyAnalysis); setProjectId(null); setEstimate(null); setAutoSaved(false); setRegenerateRooms([]); setError(''); setWholePlan(null); setMeasurementChanged(false);
    setStep(next === 'upload' ? 'upload' : 'analysis'); onStart(next);
  };
  function selectFiles(incoming: File[]) {
    if (!coinsReady) return;
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
    if (pending.current || !files.length || !coinsReady) return;
    pending.current = true; setBusy('Checking coin balance'); setError(''); setProgress(0);
    let cancelled = false;
    abort.current = () => { cancelled = true; };
    try {
      await requireCoins(AI_COIN_COSTS.floor_plan);
      const accessToken = await token();
      if (cancelled) throw new Error('Upload cancelled.');
      setBusy('Uploading your plans');
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
      setAnalysis(result.analysis); setProjectId(result.projectId); setBrief(value => ({ ...value, roomNames: result.analysis.rooms.map(room => room.name) })); setStep('scope'); void refreshWalletBalance();
    } catch (failure) { const message = failure instanceof Error ? failure.message : 'Could not analyse the plan.'; setError(message); if (/no coins left|insufficient coins|COINS_REQUIRED/i.test(message)) { setTopUpOpen(true); void refreshWalletBalance(); } }
    finally { pending.current = false; setBusy(''); abort.current = null; }
  }
  async function generate(selected?: string[], retryPricing = false) {
    if (pending.current || !coinsReady) return;
    pending.current = true; setBusy(retryPricing ? 'Completing prices and work measurements with AI' : 'Preparing your editable estimate'); setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 360000);
    abort.current = () => controller.abort();
    try {
      if (!projectId && !retryPricing) await requireCoins(AI_COIN_COSTS.ai_builder);
      controller.signal.throwIfAborted();
      const draft = getCurrentDraft();
      if (!brief.measurementInputUnit) throw new Error('Choose Sqft, Feet, Square metres or Metres before generating.');
      if ((selected || retryPricing) && JSON.stringify(draft) !== base.current) throw new Error('The editor changed. Go Back and generate a new estimate to preserve your edits.');
      base.current = JSON.stringify(draft);
      const response = await fetch('/api/quotation-ai/floor-plan', { method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: retryPricing ? 'retry_pricing' : 'generate', projectId, analysis, brief: { ...brief, automatic: true, location: brief.location.trim() || 'Unknown', roomWork: undefined }, draft, ...(selected ? { regenerateRooms: selected } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not generate an estimate.');
      if (body.measurementSystem === 'imperial') onMeasurementSystemChange?.();
      if (body.measurementChanged) setMeasurementChanged(true);
      setEstimate(body.estimate); setProjectId(body.projectId); setRegenerateRooms([]); setStep('estimate'); void refreshWalletBalance();
      // A completed estimate must survive a refresh or an accidental close. Store it in
      // the regular quotation editor immediately; the plan project itself is already
      // saved by the API and is linked when the draft save completes.
      if (!selected && !retryPricing && !body.estimate.scopeGaps?.length) {
        onApply(body.estimate.draft, base.current, body.projectId, true, body.estimate.evidence);
        setAutoSaved(true);
      }
    } catch (failure) { const message = failure instanceof Error ? failure.message : 'Could not generate an estimate.'; setError(message); if (/no coins left|insufficient coins|COINS_REQUIRED/i.test(message)) { setTopUpOpen(true); void refreshWalletBalance(); } }
    finally { clearTimeout(timeout); pending.current = false; setBusy(''); abort.current = null; }
  }
  async function complete(change: { itemId: string; widthFt: number | null; heightFt: number | null; areaSqft?: number | null; ratePerSft: number | null }) {
    if (!projectId || pending.current) return;
    pending.current = true; setBusy('Updating your estimate'); setError('');
    const controller = new AbortController(); abort.current = () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/quotation-ai/floor-plan', { method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', projectId, changes: [change] }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not update these details.');
      setEstimate(body.estimate);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update these details.'); }
    finally { clearTimeout(timeout); pending.current = false; setBusy(''); abort.current = null; }
  }
  const back = () => { setError(''); setInvalidWorkKey(''); if (step === 'work' && workRoomIndex > 0) { setWorkRoomIndex(index => index - 1); return; } setStep(({ upload: 'upload', analysis: mode === 'upload' ? 'upload' : 'analysis', scope: mode === 'upload' ? 'upload' : 'analysis', work: 'scope', design: 'work', finish: 'design', budget: 'finish', details: 'budget', review: 'details', estimate: mode === 'upload' ? 'scope' : 'review' } as Record<Step, Step>)[step]); };
  const next = () => {
    setError('');
    setInvalidWorkKey('');
    setValidationAttempt(value => value + 1);
    if (step === 'analysis') {
      if (mode === 'details') { const selectedPlan = detailPlan(homeType); setAnalysis(selectedPlan); setBrief(value => ({ ...value, roomNames: selectedPlan.rooms.map(room => room.name), roomWork: undefined })); setStep('scope'); return; }
      if (!analysis.rooms.length || analysis.rooms.some(room => !room.name.trim()) || new Set(analysis.rooms.map(room => room.name)).size !== analysis.rooms.length) { setError('Add at least one room, with a different name for each room.'); return; }
      setBrief(value => ({ ...value, roomNames: analysis.rooms.map(room => room.name) })); setStep('scope');
    } else if (step === 'scope') {
      if (wholePlan == null) { setError('Tell us whether the interior work covers the whole plan.'); return; }
      if (!scopedRooms(analysis, brief).length) { setError('Choose at least one room that matches this scope.'); return; }
      const rooms = scopedRooms(analysis, brief);
      setBrief(current => ({ ...current, roomWork: rooms.map(room => {
        const old = current.roomWork?.find(answer => answer.roomName === room.name);
        const allowed = new Set(roomWorkOptions(room, current.scope).map(option => option.key));
        return old ? { ...old, items: old.items.filter(item => allowed.has(item.key)) } : defaultRoomWork(room, current.scope);
      }) }));
      setWorkRoomIndex(0); setStep('work');
    } else if (step === 'work') {
      const rooms = scopedRooms(analysis, brief), room = rooms[workRoomIndex];
      const answer = brief.roomWork?.find(row => row.roomName === room?.name);
      const unanswered = room && roomWorkOptions(room, brief.scope).find(option => answer?.decisions?.[option.key] == null);
      if (unanswered) { setInvalidWorkKey(unanswered.key); setError(`Choose Yes or No for ${unanswered.name.toLowerCase()} in ${room.name}.`); return; }
      if (!answer?.items.length) { setError(`Select the work to include in ${room?.name || 'this room'}, or remove the room from your scope.`); return; }
      if (answer.items.some(item => (item.widthFt == null) !== (item.heightFt == null))) { setError('Enter both work dimensions, or leave both pending.'); return; }
      if (workRoomIndex + 1 < rooms.length) setWorkRoomIndex(index => index + 1);
      else setStep('design');
    } else if (step === 'design') {
      if (brief.design?.coordinatedLook == null || brief.design?.retainExisting == null) { setError('Choose Yes or No for coordinated design and retaining existing items.'); return; }
      setStep('finish');
    } else if (step === 'finish') setStep('budget');
    else if (step === 'budget') setStep(brief.clientName.trim() && brief.location.trim() ? 'review' : 'details');
    else if (step === 'details') { if (!brief.clientName.trim() || !brief.location.trim()) { setError('Enter the client name and project city.'); return; } setStep('review'); }
  };
  const updateRoom = (index: number, value: Partial<PlanAnalysis['rooms'][number]>) => setAnalysis(current => ({ ...current, rooms: current.rooms.map((room, i) => i === index ? { ...room, ...value } : room) }));
  const groups = ['upload', 'analysis'].includes(step) ? 0 : ['scope', 'work', 'design', 'finish', 'budget'].includes(step) ? 1 : step === 'details' ? 2 : 3;
  return <>
    <div className="col-span-2 min-w-0 sm:col-span-1 sm:min-w-[220px]">
      <Button type="button" disabled={proLoading} aria-busy={proLoading} aria-label={proLoading ? 'Checking Pro access' : proStatus === 'unavailable' ? 'Retry Pro access check' : isPro ? 'Build with AI' : 'Build with AI - Pro required'} className={`h-12 w-full gap-2 rounded-xl px-3 shadow-sm sm:px-4 ${!proLoading && !isPro ? 'bg-primary/65 text-primary-foreground shadow-none hover:bg-primary/75' : ''}`} onClick={() => { if (proLoading) return; if (proStatus === 'unavailable') { void refreshSubscription(); return; } if (!isPro) { setPaywallOpen(true, 'Build with AI'); return; } void refreshWalletBalance(); setChooserOpen(true); }}>{proLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : isPro ? <BuilderMark className="h-4 w-4 shrink-0" /> : <LockKeyhole className="h-4 w-4 shrink-0" />}<span className="text-sm leading-5">{proLoading ? 'Checking access...' : proStatus === 'unavailable' ? 'Retry access check' : 'Build with AI'}</span><span role="button" tabIndex={0} aria-label="Top up coins" onClick={event => { event.stopPropagation(); window.dispatchEvent(new Event('intorza:open-wallet')); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new Event('intorza:open-wallet')); } }} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-4 text-amber-900 shadow-sm"><GoldCoin className="h-3.5 w-3.5" />{walletBalance ?? '—'} coins</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Button>
    </div>
    <Dialog open={chooserOpen && !proLoading && isPro} onOpenChange={setChooserOpen}>
      <DialogContent className="max-h-[90dvh] min-w-0 max-w-xl gap-5 overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader className="pr-5 text-left">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-medium text-primary"><BuilderMark className="h-4 w-4" />INTORZA STUDIO</span><span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"><GoldCoin />{walletBalance ?? '—'} coins</span></div>
          <DialogTitle className="text-xl leading-7">Create your quotation</DialogTitle>
          <DialogDescription className="text-sm leading-6">Upload a plan or start with your project details.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 grid-cols-2 gap-2.5 pt-1 sm:gap-3" aria-label="AI quotation tools">
          {[{ mode: 'upload' as const, title: 'Floor Plan Analysis', description: 'Plan analysis and its quotation. Charged after successful analysis.', action: 'Upload Floor Plan', credits: creditDisplay.upload },
            { mode: 'details' as const, title: 'AI Quotation Builder', description: 'Start with project details. Charged after successful generation.', action: 'Generate Quotation', credits: creditDisplay.details }].map(card => <button key={card.mode} type="button" aria-label={card.action} onClick={() => start(card.mode)} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span className={`block h-28 w-full border-b sm:h-36 ${card.mode === 'upload' ? 'bg-[#F8F1E9]' : 'bg-[#EEF2ED]'}`}><BuilderArtwork kind={card.mode} /></span>
              <span className="flex flex-1 flex-col p-3 sm:p-4"><span className="mb-2 flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300"><GoldCoin className="h-3.5 w-3.5" />{card.credits} coins</span><span className="break-words text-sm font-semibold leading-5 sm:text-base">{card.title}</span>
              <span className="mb-5 mt-1.5 break-words text-xs leading-5 text-muted-foreground">{card.description}</span>
              <span className="mt-auto flex w-full items-center justify-between gap-1 text-xs font-semibold text-primary"><span>{card.mode === 'upload' ? 'Upload plan' : 'Start building'}</span><ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span></span>
            </button>)}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={mode !== null && !proLoading && isPro} onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="flex h-[min(90dvh,900px)] max-h-[calc(100dvh-1rem)] min-w-0 max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0" onInteractOutside={event => { if (busy) event.preventDefault(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-6 text-left sm:px-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary"><BuilderMark className="h-4 w-4" />Intorza Studio</p>
          <DialogTitle ref={stepHeading} tabIndex={-1} className="pr-5 text-xl leading-7 outline-none">{step === 'work' ? `Plan your ${scopedRooms(analysis, brief)[workRoomIndex]?.name || 'room'} interior` : titles[step]}</DialogTitle>
          <DialogDescription className="text-sm leading-6">{step === 'upload' ? 'Add your drawing. Review the rooms. Build your estimate.' : step === 'analysis' && mode === 'details' ? 'Choose your home size, then explain exactly what the customer needs.' : step === 'estimate' ? 'AI-generated estimate — review required. You control what is saved and shared.' : 'Choose the scope, explain the requirements, and get an editable quotation.'}</DialogDescription>
          {step !== 'upload' && mode !== 'upload' && <div className="!mt-4 flex gap-1.5" aria-label={`Step ${groups + 1} of 4`}>{['Property', 'Scope', 'Client', 'Review'].map((name, index) => <div key={name} className="min-w-0 flex-1"><div className={`h-1 rounded-full ${index <= groups ? 'bg-primary' : 'bg-muted'}`} /><span className="mt-1 block text-[11px] text-muted-foreground">{name}</span></div>)}</div>}
        </DialogHeader>
        {busy && <div ref={busyBanner} tabIndex={-1} role="status" aria-live="polite" className="shrink-0 space-y-2 border-b bg-primary/5 px-5 py-3 outline-none sm:px-6"><div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />{busy}</div>{step === 'upload' && <progress aria-label="Upload progress" value={progress} max={100} className="h-1.5 w-full accent-primary" />}</div>}
        <div ref={scrollPanel} role="region" aria-label="Quotation step content" aria-busy={!!busy} inert={!!busy} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 [overflow-wrap:anywhere] sm:px-6">
          {step === 'upload' && <>
            <div className={`rounded-2xl border border-dashed px-4 py-6 text-center sm:py-8 ${dragging ? 'border-primary bg-primary/5' : 'border-primary/25 bg-primary/[0.025]'}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy && coinsReady) selectFiles(Array.from(event.dataTransfer.files)); }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-background shadow-sm"><UploadCloud className="h-6 w-6 text-primary" strokeWidth={1.5} /></div><p className="text-base font-semibold">Choose your floor plan</p><p className="mb-5 mt-1 text-xs text-muted-foreground">Drag it here, or select a file below.</p>
              <input ref={picker} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" aria-label="Floor plan files" onChange={event => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} disabled={!!busy || !coinsReady} />
              <Button type="button" variant="outline" className="gap-2 rounded-lg bg-background" onClick={() => picker.current?.click()} disabled={!!busy || !coinsReady}><Plus className="h-4 w-4" />Browse files</Button>
              <p className="mt-4 text-[11px] leading-5 text-muted-foreground">PDF, JPG, PNG or WEBP<br />Up to 3 files · 10 MB total</p>
            </div>
            {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border p-3"><FilePreview file={file} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.name.split('.').pop()?.toUpperCase()}</p></div><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${file.name}`} disabled={!!busy} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Private & secure</span><span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300"><GoldCoin className="h-3.5 w-3.5" />{creditDisplay.upload} coins</span></div>
            <details className="text-xs leading-5 text-muted-foreground"><summary className="cursor-pointer">What makes a good upload?</summary><p className="mt-2">Use a clear drawing with readable room labels and dimensions. Multi-page PDFs are supported. You can check and correct every room after analysis.</p></details>
          </>}
          {step === 'analysis' && mode === 'details' ? <>
            <section className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4"><p className="text-sm font-semibold">What kind of home is this?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the layout. We create the usual rooms automatically, then you choose the quotation scope.</p><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{(['Studio', '1 BHK', '2 BHK', '3 BHK', '4 BHK'] as const).map(type => <button key={type} type="button" aria-pressed={homeType === type} onClick={() => setHomeType(type)} className={`rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${homeType === type ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-card hover:border-primary/35'}`}>{type}</button>)}</div></section>
            <p className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">No room-by-room form is needed. You can describe special spaces, furniture, exclusions and finish preferences in the next step.</p>
          </> : step === 'analysis' && <>
            <div className="grid grid-cols-2 gap-3"><label className="col-span-2 space-y-1 text-sm">Property type<Input value={analysis.propertyType} onChange={event => setAnalysis(current => ({ ...current, propertyType: event.target.value }))} maxLength={150} /></label><label className="space-y-1 text-sm">Floors<Input type="number" min="1" max="30" placeholder="Unknown" value={analysis.floors ?? ''} onChange={event => setAnalysis(current => ({ ...current, floors: event.target.value ? Math.max(1, Math.min(30, Number(event.target.value))) : null }))} /></label><div className="self-end rounded-lg bg-muted p-2 text-xs text-muted-foreground">{analysis.rooms.length} rooms<br />{analysis.units}</div></div>
            {!!analysis.warnings.length && <details className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100"><summary className="cursor-pointer font-medium">{analysis.warnings.length} measurement note{analysis.warnings.length === 1 ? '' : 's'} to review</summary><ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-4">{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
            {analysis.rooms.length > 0 && <p className="text-xs text-muted-foreground">Check each room. Open a room to edit its details.</p>}
            {analysis.rooms.map((room, index) => <details key={index} open={index === 0 || room.name === `Room ${analysis.rooms.length}`} className="group rounded-xl border bg-card">
              <summary className="cursor-pointer px-3 py-3 text-sm font-medium"><span className="ml-1">{room.name || `Room ${index + 1}`}</span><span className="ml-2 text-[11px] font-normal text-muted-foreground">{room.widthFt && room.lengthFt ? `${room.widthFt} × ${room.lengthFt} ft` : 'Check measurements'}</span></summary>
              <div className="space-y-3 border-t p-3">
              <div className="flex min-w-0 items-center gap-2"><Input aria-label={`Room ${index + 1} name`} value={room.name} maxLength={150} onChange={event => updateRoom(index, { name: event.target.value })} className="min-w-0 flex-1" /><Button size="icon" variant="ghost" type="button" aria-label={`Remove room ${index + 1}`} onClick={() => setAnalysis(current => ({ ...current, rooms: current.rooms.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid grid-cols-3 gap-2"><label className="space-y-1 text-xs">Room type<select value={room.kind} className="h-10 w-full min-w-0 rounded-md border bg-background px-1 text-base" onChange={event => updateRoom(index, { kind: event.target.value as typeof room.kind })}>{['bedroom','bathroom','kitchen','living','dining','balcony','utility','study','other'].map(kind => <option key={kind}>{kind}</option>)}</select></label>{(['widthFt', 'lengthFt'] as const).map((field, i) => <label key={field} className="space-y-1 text-xs">{i ? 'Length (ft)' : 'Width (ft)'}<Input type="number" min="0.01" max="100000" step="any" placeholder="Unknown" value={room[field] ?? ''} onChange={event => updateRoom(index, { [field]: event.target.value ? Number(event.target.value) : null, source: 'user', confidence: 'high' })} /></label>)}</div>
              <p className="text-xs text-muted-foreground">{room.source === 'printed' ? 'Printed dimension' : room.source === 'user' ? 'Entered by you' : 'Requires measurement'} · {room.confidence} confidence{room.file && ` · ${room.file}, page ${room.page}`}</p>{room.notes && <p className="text-xs leading-5 text-muted-foreground">{room.notes}</p>}
              </div>
            </details>)}
            <Button variant="outline" type="button" className="w-full gap-2" disabled={analysis.rooms.length >= 40} onClick={() => setAnalysis(current => ({ ...current, rooms: [...current.rooms, { name: `Room ${current.rooms.length + 1}`, kind: 'other', floor: '1', widthFt: null, lengthFt: null, source: 'user', confidence: 'high', file: '', page: 1, notes: '' }] }))}><Plus className="h-4 w-4" />Add room</Button>
          </>}
          {step === 'scope' && <QuickPlanScope analysis={analysis} brief={brief} onChange={setBrief} />}
          {step === 'work' && scopedRooms(analysis, brief)[workRoomIndex] && <>
            <p className="text-xs font-medium text-primary">Room {workRoomIndex + 1} of {scopedRooms(analysis, brief).length} · {scopedRooms(analysis, brief)[workRoomIndex].name}</p>
            <RoomWorkQuestions room={scopedRooms(analysis, brief)[workRoomIndex]} brief={brief} onChange={answer => setBrief(current => ({ ...current, roomWork: [...(current.roomWork ?? []).filter(row => row.roomName !== answer.roomName), answer] }))} />
          </>}
          {step === 'design' && <DesignIntentQuestions analysis={analysis} brief={brief} onChange={setBrief} />}
          {step === 'finish' && <div className="space-y-2">{(['Budget-friendly', 'Standard', 'Premium', 'Luxury', 'Recommend'] as const).map(finish => <button key={finish} type="button" aria-pressed={brief.finish === finish} onClick={() => setBrief(current => ({ ...current, finish }))} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm ${brief.finish === finish ? 'border-primary bg-primary/5' : ''}`}>{finish === 'Recommend' ? 'Recommend based on my budget' : finish}{brief.finish === finish && <Check className="h-4 w-4 text-primary" />}</button>)}</div>}
          {step === 'budget' && <><p className="text-sm text-muted-foreground">Optional. Leave this empty to start with the available product rates.</p><Label htmlFor="plan-budget">Approximate budget</Label><Input id="plan-budget" inputMode="decimal" type="number" min="1" max="1000000000" placeholder="No budget set" value={brief.budget ?? ''} onChange={event => setBrief(current => ({ ...current, budget: event.target.value ? Number(event.target.value) : null }))} /></>}
          {step === 'details' && <><div className="space-y-2"><Label>Client name</Label><ClientSelector value={brief.clientName} clients={clients} onChange={clientName => setBrief(current => ({ ...current, clientName }))} onClientSelect={client => setBrief(current => ({ ...current, address: client.address || current.address }))} /></div><div className="space-y-2"><Label htmlFor="plan-location">Project city or location</Label><Input id="plan-location" value={brief.location} maxLength={150} placeholder="e.g. Bengaluru" onChange={event => setBrief(current => ({ ...current, location: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="plan-address">Address (optional)</Label><Input id="plan-address" value={brief.address} maxLength={1000} onChange={event => setBrief(current => ({ ...current, address: event.target.value }))} /></div></>}
          {step === 'review' && <><dl className="space-y-3 rounded-xl border p-4 text-sm">{[['Property', `${analysis.propertyType} · ${analysis.floors ?? 'Unknown'} floor(s)`], ['Rooms included', scopedRooms(analysis, brief).map(room => room.name).join(', ')], ['Work included', (brief.roomWork ?? []).map(answer => `${answer.roomName}: ${answer.items.map(item => roomWorkOptions(analysis.rooms.find(room => room.name === answer.roomName)!, brief.scope).find(option => option.key === item.key)?.name).join(', ')}`).join('; ')], ['Design', brief.design ? `${brief.design.coordinatedLook ? 'Coordinated finishes' : 'Room-specific finishes'}; ${brief.design.retainExisting ? 'retain existing items where possible' : 'new interior work'}. ${brief.design.notes}` : 'Not set'], ['Finish', brief.finish], ['Client', brief.clientName], ['Location', brief.location], ['Budget', brief.budget?.toLocaleString() || 'Not set']].map(([name, value]) => <div key={name} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{name}</dt><dd>{value}</dd></div>)}</dl><p className="rounded-xl bg-muted p-3 text-xs leading-5">We use approved selling rates first, then research comparable published prices for your city. Sources, estimates and historical rates are labelled. Unavailable prices and missing work measurements remain pending. Your existing editor content is preserved.</p></>}
          {step === 'estimate' && estimate && <>
            {measurementChanged && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5">Switched your measurement setting to feet and square feet automatically. Plan measurements are converted to feet; pricing and PDF units now use sqft.</p>}
            <div className="rounded-xl border p-3 text-xs leading-5"><p className="font-medium">{estimate.draft.sections.length} sections · {estimate.draft.sections.reduce((count, section) => count + section.items.length, 0)} items</p><p className="text-muted-foreground">All listed sections and items will be added to your quotation. Existing work stays in the editor.</p>{!!estimate.scopeGaps?.length && <div className="mt-2 space-y-2 text-amber-800 dark:text-amber-300"><p>Selected rooms not yet included: {estimate.scopeGaps.join(', ')}. Generate these rooms or update your scope before applying this estimate.</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void generate(estimate.scopeGaps)}>Generate missing rooms</Button><Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={() => setStep('scope')}>Change scope</Button></div></div>}</div>
            <CompleteEstimate estimate={estimate} disabled={!!busy} inputUnit={brief.measurementInputUnit} onComplete={complete} onRetry={() => void generate(undefined, true)} />
            {estimate.assumptions.some(note => /Pricing search|Live market research|no recent comparable|conflict|city is unknown/.test(note)) && <details className="min-w-0 rounded-xl border p-3 text-xs leading-5"><summary className="cursor-pointer font-medium">Why some prices are missing</summary><ul className="mt-2 list-disc space-y-1 pl-4">{estimate.assumptions.filter(note => /Pricing search|Live market research|no recent comparable|conflict|city is unknown/.test(note)).map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
            <div className="rounded-xl bg-primary/5 p-4"><p className="text-xs font-medium text-primary">AI-generated estimate · rates and measurements require review</p><p className="mt-1 text-2xl font-semibold">{estimate.incomplete && estimate.totals.total === 0 ? 'Estimate pending' : estimate.totals.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">{estimate.evidence.find(item => item.price)?.price?.currency || ''}</span></p><p className="mt-1 text-xs text-muted-foreground">{estimate.incomplete ? 'Partial total: excludes items with missing quantity or rate.' : 'Includes your existing tax and discount settings.'}</p></div>
            <FloorPlanEstimateOverview estimate={estimate} />
            <details className="rounded-xl border p-3 text-xs leading-5"><summary className="cursor-pointer font-medium">Assumptions & exclusions</summary><ul className="mt-2 list-disc space-y-1 pl-4">{estimate.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
            <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-medium">Refine this estimate</summary><fieldset className="mt-3 space-y-2"><legend className="mb-2 text-xs text-muted-foreground">Select rooms to regenerate. Other rooms stay in this estimate.</legend>{[...new Set(estimate.roomSections.map(row => row.roomName))].map(name => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={regenerateRooms.includes(name)} onChange={event => setRegenerateRooms(current => event.target.checked ? [...current, name] : current.filter(room => room !== name))} />{name}</label>)}</fieldset><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!regenerateRooms.length || !!busy} onClick={() => void generate(regenerateRooms)}>Regenerate selected items</Button><Button type="button" size="sm" variant="ghost" disabled={!!busy} onClick={() => setStep('details')}>Edit Project Details</Button></div></details>
            <p className="text-xs text-muted-foreground">{autoSaved ? 'This estimate is being saved to My Quotations as a draft. Open the editor to adjust products, measurements and rates.' : 'Open the editor to adjust products, measurements and rates, then save it as a draft.'}</p>
          </>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {error && <div ref={errorBanner} tabIndex={-1} role="alert" className="w-full rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950 outline-none"><p className="font-semibold">{error}</p>{/insufficient coins/i.test(error) && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => window.dispatchEvent(new Event('intorza:open-wallet'))}>Top up coins</Button>}{error === AI_SERVICE_ISSUE && <><p className="mt-1 text-amber-900/80">Your coins will not be charged for this request.</p><p className="mt-2 text-xs text-amber-900/70">Feel free to go back and try again later.</p></>}</div>}
          {!busy && requiredCoins > 0 && !coinsReady && <div role="status" className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><span>{walletChecking ? 'Checking your coin balance...' : walletBalance === null ? 'Could not verify your coin balance.' : `You have ${walletBalance} coins. ${requiredCoins} coins are required.`}</span><Button type="button" variant="outline" size="sm" disabled={walletChecking} onClick={() => walletBalance === null ? void refreshWalletBalance() : setTopUpOpen(true)}>{walletBalance === null ? 'Retry balance check' : 'View top-up'}</Button></div>}
          {busy ? <Button variant="outline" type="button" onClick={() => abort.current?.()}>Cancel request</Button> : <>
            <Button variant="outline" type="button" onClick={step === 'upload' || step === 'analysis' && mode === 'details' ? onClose : back}><ArrowLeft className="mr-1 h-4 w-4" />{step === 'upload' || step === 'analysis' && mode === 'details' ? 'Cancel' : 'Back'}</Button>
            {step === 'upload' ? <Button type="button" className="min-w-0 flex-1" disabled={!files.length || !coinsReady} onClick={() => void analyse()}>Analyse Floor Plan</Button> : step === 'scope' ? <Button type="button" className="min-w-0 flex-1" disabled={!coinsReady || !scopedRooms(analysis, brief).length || !brief.measurementInputUnit} onClick={() => void generate()}>Generate Quotation<ArrowRight className="ml-2 h-4 w-4" /></Button> : step === 'review' ? <Button disabled={!coinsReady} type="button" className="min-w-0 flex-1" onClick={() => void generate()}>Generate Quotation</Button> : step === 'estimate' ? <>
            {autoSaved ? <Button type="button" className="min-w-0 flex-1" onClick={onClose}>Open quotation</Button> : <>
              <Button type="button" variant="outline" className="min-w-0 flex-1" disabled={!!estimate?.scopeGaps?.length} onClick={() => { try { if (estimate && projectId) { onApply(estimate.draft, base.current, projectId, false, estimate.evidence); onClose(); } } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not apply the estimate.'); } }}>Edit Quotation</Button>
              <Button type="button" className="w-full sm:w-auto" disabled={!!estimate?.scopeGaps?.length} onClick={() => { try { if (estimate && projectId) { onApply(estimate.draft, base.current, projectId, true, estimate.evidence); onClose(); } } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the estimate.'); } }}>Save as Draft</Button>
            </>}
            </> : <Button type="button" className="min-w-0 flex-1" disabled={!coinsReady} onClick={next}>Continue<ArrowRight className="ml-1 h-4 w-4" /></Button>}
          </>}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={topUpOpen && mode !== null && isPro && !walletChecking && walletBalance !== null && requiredCoins > 0} onOpenChange={setTopUpOpen}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><GoldCoin />Top up to use AI</DialogTitle><DialogDescription>{requiredCoins === AI_COIN_COSTS.floor_plan ? 'Floor plan analysis' : 'AI quotation generation'} needs {requiredCoins} coins. Add coins to unlock this feature.</DialogDescription></DialogHeader>
        <dl className="space-y-3 rounded-xl bg-muted/50 p-4 text-sm"><div className="flex justify-between"><dt>Your balance</dt><dd className="font-semibold">{walletBalance ?? '-'} coins</dd></div><div className="flex justify-between"><dt>Required</dt><dd className="font-semibold">{requiredCoins} coins</dd></div><div className="flex justify-between border-t pt-3"><dt>Coins to add</dt><dd className="font-semibold text-primary">{Math.max(0, requiredCoins - (walletBalance ?? 0))} coins</dd></div></dl>
        <p className="text-xs text-muted-foreground">Your progress is kept. AI actions unlock after your updated balance is verified.</p>
        <Button type="button" className="w-full" onClick={() => { setTopUpOpen(false); window.dispatchEvent(new Event('intorza:open-wallet')); }}>Top up coins</Button>
        <Button type="button" variant="ghost" onClick={() => setTopUpOpen(false)}>Maybe later</Button>
      </DialogContent>
    </Dialog>
  </>;
}
