"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Send, Undo2, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, reviewDraft, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { browserSpeechInput, type BrowserRecognition, type SpeechInputProvider } from '@/lib/quotation-ai/browser-speech';
import type { ConversationTurn } from '@/lib/quotation-ai/provider';

type Props = {
  initialDraft: VoiceDraft;
  getCurrentDraft: () => VoiceDraft;
  onChange: (draft: VoiceDraft, expectedSnapshot: string) => string;
  onClose: () => void;
  speechInput?: SpeechInputProvider;
};
export function VoiceQuotationAssistant({ initialDraft, getCurrentDraft, onChange, onClose, speechInput = browserSpeechInput }: Props) {
  const [question, setQuestion] = useState(() => {
    const missing = reviewDraft(initialDraft).missing;
    if (missing.includes('Client name')) return 'Who is this quotation for?';
    if (missing.includes('Quotation title')) return 'What should we call this quotation?';
    if (missing.includes('At least one quotation item')) return 'What work should we include? Tell me the first item.';
    return missing.length ? `Please tell me ${missing[0].toLowerCase()}.` : 'Your quotation is filled in. What would you like to add or change?';
  });
  const [input, setInput] = useState('');
  const [heard, setHeard] = useState('');
  const [status, setStatus] = useState<'paused' | 'listening' | 'thinking' | 'speaking'>('paused');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [undoCount, setUndoCount] = useState(0);
  const [updated, setUpdated] = useState(false);
  const draft = useRef(initialDraft);
  const snapshot = useRef(JSON.stringify(initialDraft));
  const history = useRef<ConversationTurn[]>([]);
  const undo = useRef<{ draft: VoiceDraft; after: string }[]>([]);
  const active = useRef(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const recognition = useRef<BrowserRecognition | null>(null);
  const audioGeneration = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef({ getCurrentDraft, onChange, onClose, language });
  latest.current = { getCurrentDraft, onChange, onClose, language };

  function stopAudio() {
    audioGeneration.current++;
    const current = recognition.current; recognition.current = null;
    if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
    window.speechSynthesis?.cancel();
  }
  function pause() {
    active.current = false; stopAudio(); controller.current?.abort();
    setStatus('paused');
  }
  useEffect(() => {
    mounted.current = true; setSupported(speechInput.available());
    const hide = () => { if (document.hidden) pause(); };
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { pause(); latest.current.onClose(); } });
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; active.current = false; stopAudio(); controller.current?.abort(); data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', hide); };
    // Audio lifecycle belongs to this mounted assistant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speak(text: string, listenAfter = true) {
    stopAudio();
    if (!mounted.current || !active.current) return;
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      if (listenAfter && speechInput.available()) listen(); else setStatus('paused');
      return;
    }
    setStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    const generation = audioGeneration.current;
    utterance.lang = latest.current.language;
    utterance.onend = () => {
      if (!mounted.current || !active.current || generation !== audioGeneration.current) return;
      if (listenAfter && speechInput.available() && !document.hidden) listen(); else setStatus('paused');
    };
    utterance.onerror = () => { if (mounted.current && active.current && generation === audioGeneration.current) { active.current = false; setStatus('paused'); setError('Spoken playback stopped. Read the question and use Speak or type below.'); } };
    window.speechSynthesis.speak(utterance);
  }
  function listen() {
    if (!mounted.current || !active.current || inFlight.current) return;
    stopAudio(); setError('');
    let final = '';
    try {
      const current = speechInput.create(latest.current.language);
      recognition.current = current;
      current.onresult = event => {
        if (recognition.current !== current) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += `${event.results[i][0].transcript} `;
          else interim += event.results[i][0].transcript;
        }
        setHeard((final + interim).trim().slice(0, 3000));
      };
      current.onerror = event => {
        if (recognition.current !== current) return;
        active.current = false; stopAudio(); setStatus('paused');
        setInput(final.trim().slice(0, 3000));
        setError(event.error === 'not-allowed' ? 'Allow microphone access in browser settings, or type your answer.' : 'Could not hear your answer clearly. Tap Speak to retry, or type below.');
      };
      current.onend = () => {
        if (recognition.current !== current) return;
        recognition.current = null;
        if (!active.current || !mounted.current) return;
        if (final.trim()) { setInput(final.trim().slice(0, 3000)); void send(final.trim().slice(0, 3000)); }
        else { active.current = false; setStatus('paused'); }
      };
      current.start(); setStatus('listening');
    } catch { active.current = false; setStatus('paused'); setError('Voice recognition is unavailable. Type your answer below.'); }
  }
  async function send(message: string) {
    if (!message.trim() || inFlight.current) return;
    inFlight.current = true; setError(''); setStatus('thinking'); setUpdated(false);
    const abort = new AbortController(); controller.current = abort;
    try {
      const current = latest.current.getCurrentDraft();
      const expected = JSON.stringify(current);
      // Rebase on manual edits; retain nullable voice metadata when the form is unchanged.
      const before = expected === snapshot.current ? draft.current : current;
      if (expected !== snapshot.current) { history.current = []; undo.current = []; setUndoCount(0); }
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Sign in to use the voice assistant.');
      if (abort.signal.aborted) return;
      const response = await fetch('/api/quotation-ai/turn', { method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ draft: before, message, language: latest.current.language, history: history.current.slice(-8) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not process your answer.');
      const next = draftSchema.parse(body.draft);
      if (abort.signal.aborted || !mounted.current) return;
      if (typeof body.reply !== 'string') throw new Error('Invalid assistant response.');
      if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('You edited the form while I was thinking. Your edits are safe; send your answer again to continue from them.');
      if (body.changed) {
        const after = latest.current.onChange(next, expected);
        undo.current = [...undo.current.slice(-9), { draft: before, after }]; setUndoCount(undo.current.length);
        snapshot.current = after; setUpdated(true);
      } else snapshot.current = expected;
      draft.current = next;
      history.current = [...history.current.slice(-6), { role: 'user', text: message.slice(0, 1500) }, { role: 'assistant', text: body.reply.slice(0, 1500) }];
      setQuestion(body.reply); setInput(''); setHeard(message);
      // Release the request lock before speech finishes and starts the next listening turn.
      inFlight.current = false;
      if (active.current) speak(body.reply, reviewDraft(next).missing.length > 0); else setStatus('paused');
    } catch (failure) {
      if (!abort.signal.aborted && mounted.current) { setError(failure instanceof Error ? failure.message : 'Could not connect. Please try again.'); active.current = false; setStatus('paused'); }
    } finally { inFlight.current = false; }
  }
  function undoLast() {
    const entry = undo.current[undo.current.length - 1];
    if (!entry) return;
    try {
      if (JSON.stringify(latest.current.getCurrentDraft()) !== entry.after) throw new Error('The form was edited manually. Undo would overwrite those edits, so please correct the fields directly.');
      const after = latest.current.onChange(entry.draft, entry.after);
      draft.current = entry.draft; snapshot.current = after; history.current = [];
      undo.current.pop();
      if (undo.current.length) undo.current[undo.current.length - 1].after = after;
      setUndoCount(undo.current.length); setQuestion('Last voice change undone. What would you like to change?'); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not undo this change.'); }
  }
  const working = status === 'thinking';
  return <section aria-label="Voice quotation assistant" className="rounded-2xl border border-orange-200 bg-orange-50/50 p-3 shadow-sm dark:border-orange-900 dark:bg-orange-950/10 sm:p-4">
    <div className="flex items-start gap-3">
      <button type="button" aria-label={status === 'paused' ? 'Start voice conversation' : 'Pause voice conversation'} disabled={!supported || working} onClick={() => { if (status !== 'paused') pause(); else { active.current = true; speak(question); } }} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm disabled:opacity-50 ${status === 'listening' ? 'animate-pulse ring-4 ring-orange-200 dark:ring-orange-900' : ''}`}>
        {working ? <Loader2 className="h-5 w-5 animate-spin" /> : status === 'paused' ? <Mic className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Quotation voice assistant</h2><span role="status" className="text-xs text-muted-foreground">{status === 'thinking' ? 'Updating fields...' : status === 'listening' ? 'Listening...' : status === 'speaking' ? 'Speaking...' : 'Ready'}</span></div>
        <p aria-live="polite" className="mt-1 text-sm">{question}</p>
        {heard && <p className="mt-1 truncate text-xs text-muted-foreground" title={heard}>You: {heard}</p>}
        {updated && <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-300">Quotation fields updated below. You can edit them anytime.</p>}
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label="Close voice assistant" className="h-8 w-8 shrink-0" onClick={onClose}><X className="h-4 w-4" /></Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={!supported || working} onClick={() => { if (status !== 'paused') pause(); else { active.current = true; listen(); } }}>{status === 'paused' ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{status === 'paused' ? 'Speak' : 'Pause'}</Button>
      <Button type="button" size="sm" variant="ghost" disabled={working || status !== 'paused'} onClick={() => { active.current = true; speak(question, false); }}><Volume2 className="h-4 w-4" />Read question</Button>
      <Button type="button" size="sm" variant="ghost" disabled={!undoCount || status !== 'paused'} onClick={undoLast}><Undo2 className="h-4 w-4" />Undo</Button>
      <label className="sr-only" htmlFor="voice-language">Speech language</label><select id="voice-language" value={language} disabled={status !== 'paused'} onChange={event => setLanguage(event.target.value as 'en-IN' | 'hi-IN')} className="ml-auto rounded-md border bg-background px-2 py-1.5 text-xs"><option value="en-IN">English</option><option value="hi-IN">Hindi</option></select>
    </div>
    <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); active.current = false; stopAudio(); void send(input); }}>
      <label className="sr-only" htmlFor="voice-answer">Your answer</label><Input id="voice-answer" value={input} maxLength={3000} disabled={status !== 'paused'} onChange={event => setInput(event.target.value)} placeholder="Or type your answer or correction..." className="h-9 bg-background text-sm" />
      <Button type="submit" size="sm" disabled={!input.trim() || status !== 'paused'} aria-label="Send answer"><Send className="h-4 w-4" /></Button>
    </form>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    {!supported && <p className="mt-2 text-xs text-muted-foreground">Voice recognition is unavailable in this browser. You can type your answers.</p>}
    <p className="mt-2 text-xs text-muted-foreground">{supported ? 'Speech uses your browser recognition service. ' : ''}Check measurements and prices before saving. Tax and discount changes still need Apply pricing.</p>
  </section>;
}
