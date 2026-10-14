"use client";

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Send, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, operationSchema, reviewDraft, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { GeminiLiveSession } from '@/lib/quotation-ai/live-session';
import { VoiceQuotationAssistant, type VoiceAssistantProps } from './VoiceQuotationAssistant';

export function QuotationVoiceAssistant(props: VoiceAssistantProps) {
  const [mode, setMode] = useState<'live' | 'browser'>('live');
  return <div className="space-y-2">
    <div className="flex justify-end gap-1" role="group" aria-label="Voice engine">
      <Button size="sm" variant={mode === 'live' ? 'secondary' : 'ghost'} aria-pressed={mode === 'live'} onClick={() => setMode('live')}>Live voice</Button>
      <Button size="sm" variant={mode === 'browser' ? 'secondary' : 'ghost'} aria-pressed={mode === 'browser'} onClick={() => setMode('browser')}>Browser / text</Button>
    </div>
    {mode === 'live' ? <LiveQuotationAssistant {...props} /> : <VoiceQuotationAssistant {...props} />}
  </div>;
}
export function LiveQuotationAssistant(props: VoiceAssistantProps) {
  const [status, setStatus] = useState<'paused' | 'connecting' | 'live'>('paused');
  const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [question, setQuestion] = useState('Start live voice to build your quotation.');
  const [heard, setHeard] = useState(''); const [input, setInput] = useState(''); const [error, setError] = useState('');
  const [noisy, setNoisy] = useState(false); const [pending, setPending] = useState(false); const [undoCount, setUndoCount] = useState(0);
  const [pendingSummary, setPendingSummary] = useState<string[]>([]);
  const session = useRef<GeminiLiveSession | null>(null); const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const approval = useRef<((value: boolean) => void) | null>(null);
  const pendingCall = useRef<string | null>(null);
  const nextOutput = useRef(true); const nextInput = useRef(true);
  const current = useRef(props.initialDraft); const fingerprint = useRef(JSON.stringify(props.initialDraft));
  const lastRead = useRef<string | null>(null);
  const undo = useRef<{ draft: VoiceDraft; after: string }[]>([]);
  const latest = useRef({ ...props, noisy }); latest.current = { ...props, noisy };
  const hi = language === 'hi-IN';
  function stop() {
    approval.current?.(false); approval.current = null; setPending(false);
    request.current?.abort(); session.current?.stop(); session.current = null; setStatus('paused');
  }
  useEffect(() => {
    mounted.current = true;
    try { if (localStorage.getItem('quotation-voice-language') === 'hi-IN') setLanguage('hi-IN'); } catch { /* Optional preference. */ }
    const hide = () => { if (document.hidden) stop(); };
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { stop(); latest.current.onClose(); } });
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; approval.current?.(false); request.current?.abort(); session.current?.stop(); data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', hide); };
    // Mounted session cleanup owns microphone, socket, playback and pending tools.
  }, []);
  function sync() {
    const form = latest.current.getCurrentDraft(); const now = JSON.stringify(form);
    if (now !== fingerprint.current) {
      current.current = { ...form, revision: current.current.revision + 1 }; fingerprint.current = now;
      undo.current = []; setUndoCount(0);
    }
    return now;
  }
  async function api(payload: unknown, signal: AbortSignal) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in to use live voice.');
    if (signal.aborted) throw new Error('Canceled');
    const response = await fetch('/api/quotation-ai/live', { method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`${result.error || 'Live voice request failed.'}${result.code ? ` [${result.code}]` : ''}${result.requestId ? ` Reference: ${result.requestId}` : ''}`);
    return result;
  }
  async function start() {
    if (session.current) return;
    setError(''); setStatus('connecting'); setHeard(''); lastRead.current = null;
    const controller = new AbortController(); request.current = controller;
    const live = new GeminiLiveSession({
      onReady: () => { if (mounted.current) setStatus('live'); },
      onInput: text => { if (mounted.current) { const first = nextInput.current; nextInput.current = false; setHeard(previous => ((first ? '' : previous) + text).slice(-1500)); } },
      onOutput: text => { if (mounted.current) { const first = nextOutput.current; nextOutput.current = false; setQuestion(previous => ((first ? '' : previous) + text).slice(-1500)); } },
      onTurnComplete: () => { nextOutput.current = true; nextInput.current = true; },
      onToolCancellation: ids => { if (pendingCall.current && ids.includes(pendingCall.current)) approval.current?.(false); },
      onEnd: () => { if (mounted.current) { stop(); setQuestion(hi ? 'सत्र समाप्त हुआ। फिर शुरू करके आगे बढ़ें।' : 'Session ended. Start again to continue from your quotation.'); } },
      onError: message => { if (mounted.current) { stop(); setError(message); } },
      onTool: async (call, canceled) => {
        if (canceled()) return { error: 'Canceled' };
        const beforeFingerprint = sync();
        if (call.name === 'get_quotation') { lastRead.current = beforeFingerprint; return { draft: current.current, review: reviewDraft(current.current) }; }
        if (call.name !== 'apply_quotation') return { error: 'Unknown tool. Only quotation editing is available.' };
        if (lastRead.current !== beforeFingerprint || call.args?.expectedRevision !== current.current.revision) return { error: 'The quotation changed. Call get_quotation and clarify before making edits.' };
        const operations = operationSchema.array().max(30).parse(JSON.parse(String(call.args?.operationsJson || '[]')));
        if (!operations.length) return { draft: current.current, review: reviewDraft(current.current) };
        if (latest.current.noisy) {
          if (approval.current) return { error: 'Another change is waiting for user review.' };
          setPending(true);
          const labels: Record<string, string> = { clientName: 'Client', projectTitle: 'Quotation', clientAddress: 'Address', productName: 'Product', productDetails: 'Details', side: 'Side', widthFt: 'Width (ft)', heightFt: 'Height (ft)', sftArea: 'Area (sq ft)', ratePerSft: 'Rate / sq ft', gstEnabled: 'Tax enabled', gstRate: 'Tax %', discountPercentage: 'Discount %', enableSocialMediaDiscount: 'Social discount enabled', socialMediaDiscountRate: 'Social discount %', measurementMode: 'Measurement method', placeOfProject: 'Location', projectType: 'Project type' };
          setPendingSummary(operations.map(op => {
            if (op.type === 'add_section') return `New section: ${op.title}`;
            const item = 'itemId' in op ? current.current.sections.flatMap(section => section.items).find(item => item.id === op.itemId) : null;
            if (op.type === 'remove_item') return `Remove: ${item?.productName || 'item'}`;
            return `${item?.productName ? item.productName + ': ' : ''}${Object.entries(op.fields).map(([key, value]) => `${labels[key] || key}: ${value == null ? 'not provided' : String(value)}`).join(', ')}`;
          }));
          pendingCall.current = call.id;
          const accepted = await new Promise<boolean>(resolve => { approval.current = resolve; });
          pendingCall.current = null;
          approval.current = null; if (mounted.current) setPending(false);
          if (!accepted || canceled()) return { error: 'User declined or canceled the change. Do not repeat it automatically.' };
        }
        const before = current.current;
        const validated = await api({ action: 'tool', draft: before, operations, expectedRevision: before.revision }, controller.signal);
        if (canceled() || controller.signal.aborted || !mounted.current) return { error: 'Canceled' };
        if (fingerprint.current !== beforeFingerprint || JSON.stringify(latest.current.getCurrentDraft()) !== beforeFingerprint) return { error: 'The quotation changed during validation. Re-read it and clarify.' };
        const draft = draftSchema.parse(validated.draft);
        const after = latest.current.onChange(draft, beforeFingerprint);
        current.current = draft; fingerprint.current = after; lastRead.current = after;
        undo.current = [...undo.current.slice(-9), { draft: before, after }]; setUndoCount(undo.current.length);
        return { draft, review: reviewDraft(draft), applied: true };
      },
    });
    session.current = live;
    try {
      await live.prepareAudio();
      if (controller.signal.aborted || !mounted.current) return;
      sync();
      const config = await api({ action: 'session', draft: current.current, language }, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setQuestion(''); live.connect(config.token, config.setup, config.expiresAt);
    } catch (failure) { if (!controller.signal.aborted && mounted.current) { stop(); setError(failure instanceof Error ? failure.message : 'Could not start live voice.'); } }
  }
  function undoLast() {
    stop(); const entry = undo.current[undo.current.length - 1]; if (!entry) return;
    try {
      if (JSON.stringify(latest.current.getCurrentDraft()) !== entry.after) throw new Error('Manual edits are present. Correct the fields directly to preserve them.');
      fingerprint.current = latest.current.onChange(entry.draft, entry.after); current.current = entry.draft; lastRead.current = null;
      undo.current.pop(); if (undo.current.length) undo.current[undo.current.length - 1].after = fingerprint.current;
      setUndoCount(undo.current.length); setQuestion(hi ? 'पिछला बदलाव हटाया गया।' : 'Last voice change undone.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not undo.'); }
  }
  return <section aria-label="Gemini live quotation assistant" lang={hi ? 'hi' : 'en'} className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/10">
    <div className="flex items-start gap-3"><Mic className={`mt-1 h-6 w-6 shrink-0 text-orange-600 ${status === 'live' ? 'animate-pulse' : ''}`} /><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{hi ? 'लाइव कोटेशन सहायक' : 'Live quotation assistant'}</h2><p role="status" className="text-xs text-muted-foreground">{status === 'live' ? hi ? 'जुड़े हैं — बोलिए' : 'Connected — speak naturally' : status === 'connecting' ? hi ? 'जोड़ रहे हैं...' : 'Connecting...' : hi ? 'तैयार' : 'Ready'}</p><p aria-live="polite" className="mt-1 text-sm">{question}</p>{heard && <p className="mt-1 truncate text-xs text-muted-foreground" title={heard}>{hi ? 'आप: ' : 'You: '}{heard}</p>}</div><Button variant="ghost" size="icon" aria-label="Close live voice" onClick={props.onClose}><X className="h-4 w-4" /></Button></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => { if (status === 'paused') void start(); else stop(); }}>{status === 'paused' ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{status === 'paused' ? hi ? 'शुरू करें' : 'Start live voice' : hi ? 'रोकें' : 'Pause'}</Button><Button size="sm" variant="ghost" disabled={!undoCount} onClick={undoLast}><Undo2 className="h-4 w-4" />{hi ? 'पिछला बदलाव हटाएँ' : 'Undo'}</Button><select aria-label="Live speech language" className="ml-auto rounded-md border bg-background p-2 text-xs" disabled={status !== 'paused'} value={language} onChange={event => { setLanguage(event.target.value as 'en-IN' | 'hi-IN'); try { localStorage.setItem('quotation-voice-language', event.target.value); } catch { /* Optional preference. */ } }}><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option></select></div>
    <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={noisy} disabled={status !== 'paused'} onChange={event => setNoisy(event.target.checked)} />{hi ? 'शोर वाली जगह: बदलाव की पुष्टि करें' : 'Noisy surroundings: confirm changes'}</label>
    {pending && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" aria-label="Proposed quotation changes">{pendingSummary.map((summary, index) => <li key={index}>{summary}</li>)}</ul>}
    {pending && <div role="alert" className="mt-2 rounded-lg border p-2 text-sm"><p>{hi ? 'ऊपर सुना गया जवाब सही है? तभी बदलाव स्वीकार करें।' : 'Check the recognized answer above before accepting these changes.'}</p><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => approval.current?.(true)}>{hi ? 'स्वीकार करें' : 'Accept change'}</Button><Button size="sm" variant="outline" onClick={() => approval.current?.(false)}>{hi ? 'रद्द करें' : 'Reject'}</Button></div></div>}
    <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); if (input.trim()) { session.current?.text(input); setInput(''); } }}><Input aria-label="Live typed answer" value={input} maxLength={3000} disabled={status !== 'live'} onChange={event => setInput(event.target.value)} placeholder={hi ? 'या जवाब लिखिए...' : 'Or type an answer...'} /><Button size="sm" type="submit" aria-label="Send live answer" disabled={status !== 'live' || !input.trim()}><Send className="h-4 w-4" /></Button></form>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    <p className="mt-2 text-xs text-muted-foreground">{hi ? 'आवाज़ Gemini को भेजी जाती है। माप और कीमत सेव करने से पहले जाँचें। सत्र अधिकतम तीन मिनट का है।' : 'Audio is sent to Gemini. Check measurements and prices before saving. Sessions last up to three minutes.'}</p>
  </section>;
}
