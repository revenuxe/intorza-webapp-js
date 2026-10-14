"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Send, Undo2, X } from 'lucide-react';
import { QuestionPlayback } from './QuestionPlayback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, reviewDraft, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { browserSpeechInput, type BrowserRecognition, type SpeechInputProvider } from '@/lib/quotation-ai/browser-speech';
import type { ConversationTurn } from '@/lib/quotation-ai/provider';
import { initialQuestion, romanLetters, type VoiceLanguage } from '@/lib/quotation-ai/language';
import { classifySpeechTurn } from '@/lib/quotation-ai/turn-policy';
import { hasNonEnglishDraft } from '@/lib/quotation-ai/english-output';

export type VoiceAssistantProps = {
  initialDraft: VoiceDraft;
  getCurrentDraft: () => VoiceDraft;
  onChange: (draft: VoiceDraft, expectedSnapshot: string) => string;
  onClose: () => void;
  speechInput?: SpeechInputProvider;
};
export function VoiceQuotationAssistant({ initialDraft, getCurrentDraft, onChange, onClose, speechInput = browserSpeechInput }: VoiceAssistantProps) {
  const [question, setQuestion] = useState(() => initialQuestion(initialDraft, 'en-IN'));
  const spokenQuestion = useRef(initialQuestion(initialDraft, 'en-IN'));
  const [input, setInput] = useState('');
  const [heard, setHeard] = useState('');
  const [status, setStatus] = useState<'paused' | 'listening' | 'thinking' | 'speaking'>('paused');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [speechNotice, setSpeechNotice] = useState('');
  const [reviewSpeech, setReviewSpeech] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [updated, setUpdated] = useState(false);
  const [needsEnglish, setNeedsEnglish] = useState(() => hasNonEnglishDraft(initialDraft));
  const [modelProvider, setModelProvider] = useState<'Meta' | 'OpenAI'>('Meta');
  const playback = useRef<HTMLAudioElement | null>(null);
  const speechUrl = useRef<string | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
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
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rearmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoredTurns = useRef(0);
  const latest = useRef({ getCurrentDraft, onChange, onClose, language, question, reviewSpeech });
  latest.current = { getCurrentDraft, onChange, onClose, language, question, reviewSpeech };
  const t = (english: string, _hindi: string) => english;

  function stopAudio() {
    speechRequest.current?.abort();
    if (playback.current) { playback.current.onended = null; playback.current.onerror = null; playback.current.pause(); playback.current.removeAttribute('src'); playback.current = null; }
    if (speechUrl.current) { URL.revokeObjectURL(speechUrl.current); speechUrl.current = null; }
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (rearmTimer.current) clearTimeout(rearmTimer.current);
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
    try {
      const saved = localStorage.getItem('quotation-voice-language');
      if (saved === 'hi-IN' || saved === 'en-IN') { setLanguage(saved); spokenQuestion.current = initialQuestion(initialDraft, saved); }
    } catch { /* Language preference is optional. */ }
    const hide = () => { if (document.hidden) pause(); };
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { pause(); latest.current.onClose(); } });
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; active.current = false; stopAudio(); controller.current?.abort(); data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', hide); };
    // Audio lifecycle belongs to this mounted assistant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function speak(text: string, listenAfter = true) {
    stopAudio();
    if (!mounted.current || !active.current) return;
    setStatus('speaking'); setSpeechNotice('');
    const generation = audioGeneration.current;
    const abort = new AbortController(); speechRequest.current = abort;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Sign in to hear spoken questions.');
      if (abort.signal.aborted) return;
      const response = await fetch('/api/quotation-ai/speech', {
        method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ text, language: latest.current.language }),
      });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Spoken question could not load.'); }
      const blob = await response.blob();
      if (!mounted.current || !active.current || abort.signal.aborted || generation !== audioGeneration.current) return;
      const url = URL.createObjectURL(blob); speechUrl.current = url;
      const audio = new Audio(url); playback.current = audio;
      audio.onended = () => {
        if (!mounted.current || !active.current || generation !== audioGeneration.current) return;
        URL.revokeObjectURL(url); speechUrl.current = null; playback.current = null;
        if (listenAfter && speechInput.available() && !document.hidden) listen(); else { active.current = false; setStatus('paused'); }
      };
      audio.onerror = () => {
        if (mounted.current && generation === audioGeneration.current) { stopAudio(); active.current = false; setStatus('paused'); setSpeechNotice('Audio could not play. Read the English question, then use Speak or type your answer.'); }
      };
      await audio.play();
    } catch (failure) {
      if (!abort.signal.aborted && mounted.current && generation === audioGeneration.current) {
        stopAudio(); active.current = false; setStatus('paused');
        setSpeechNotice(failure instanceof Error ? failure.message : 'Audio could not play. Read the English question below.');
      }
    }
  }
  function listen() {
    if (!mounted.current || !active.current || inFlight.current) return;
    stopAudio(); setError('');
    let final = '';
    let lastInterim = '';
    let uncertain = false;
    const finalSegments = new Map<number, string>();
    try {
      const current = speechInput.create(latest.current.language);
      recognition.current = current;
      idleTimer.current = setTimeout(() => { if (recognition.current === current) current.stop(); }, 15000);
      current.onresult = event => {
        if (recognition.current !== current) return;
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => { if (recognition.current === current) current.stop(); }, 15000);
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalSegments.set(i, event.results[i][0].transcript);
            const confidence = event.results[i][0].confidence;
            if (confidence > 0 && confidence < 0.6) uncertain = true;
          }
          else interim += event.results[i][0].transcript;
        }
        final = [...finalSegments.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join(' ');
        lastInterim = interim;
        setHeard(romanLetters((final + interim).trim().slice(0, 3000)));
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (final || interim) silenceTimer.current = setTimeout(() => { if (recognition.current === current) current.stop(); }, interim ? 1200 : 600);
      };
      current.onerror = event => {
        if (recognition.current !== current) return;
        active.current = false; stopAudio(); setStatus('paused');
        setInput(romanLetters(final.trim().slice(0, 3000)));
        setError(latest.current.language === 'hi-IN'
          ? event.error === 'not-allowed' ? 'à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤¸à¥‡à¤Ÿà¤¿à¤‚à¤— à¤®à¥‡à¤‚ à¤®à¤¾à¤‡à¤•à¥à¤°à¥‹à¤«à¤¼à¥‹à¤¨ à¤•à¥€ à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤¦à¥‡à¤‚, à¤¯à¤¾ à¤…à¤ªà¤¨à¤¾ à¤œà¤µà¤¾à¤¬ à¤²à¤¿à¤–à¤¿à¤à¥¤' : 'à¤†à¤ªà¤•à¤¾ à¤œà¤µà¤¾à¤¬ à¤¸à¤¾à¤«à¤¼ à¤¨à¤¹à¥€à¤‚ à¤¸à¥à¤¨à¤¾à¤ˆ à¤¦à¤¿à¤¯à¤¾à¥¤ à¤«à¤¿à¤° à¤¸à¥‡ à¤¬à¥‹à¤²à¤¿à¤ à¤¯à¤¾ à¤œà¤µà¤¾à¤¬ à¤²à¤¿à¤–à¤¿à¤à¥¤'
          : event.error === 'not-allowed' ? 'Allow microphone access in browser settings, or type your answer.' : 'Could not hear your answer clearly. Tap Speak to retry, or type below.');
      };
      current.onend = () => {
        if (recognition.current !== current) return;
        recognition.current = null;
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (!active.current || !mounted.current) return;
        if (!final.trim() && lastInterim.trim()) { final = lastInterim; uncertain = true; }
        const kind = classifySpeechTurn(final, latest.current.question);
        if (kind !== 'answer') {
          setHeard('');
          ignoredTurns.current++;
          if (kind !== 'empty' && ignoredTurns.current <= 2 && !document.hidden) {
            rearmTimer.current = setTimeout(() => { if (mounted.current && active.current) listen(); }, 200);
          } else { active.current = false; setStatus('paused'); }
          return;
        }
        ignoredTurns.current = 0;
        if ((uncertain || latest.current.reviewSpeech) && final.trim()) {
          active.current = false; setStatus('paused'); setInput(romanLetters(final.trim().slice(0, 3000)));
          setError(latest.current.language === 'hi-IN' ? 'à¤¨à¥€à¤šà¥‡ à¤²à¤¿à¤–à¤¾ à¤œà¤µà¤¾à¤¬ à¤œà¤¾à¤à¤šà¤•à¤° à¤­à¥‡à¤œà¥‡à¤‚à¥¤' : 'Check the answer below before sending.');
          return;
        }
        if (final.trim()) { setInput(romanLetters(final.trim().slice(0, 3000))); void send(final.trim().slice(0, 3000)); }
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
      if (!response.ok) throw new Error(`${body.error || 'Could not process your answer.'}${body.retryAfterSeconds ? ` Retry after ${body.retryAfterSeconds} seconds.` : ''}${body.providerCode ? ` Provider reason: ${body.providerCode}.` : ''}${body.code ? ` [${body.code}]` : ''}${body.requestId ? ` Reference: ${body.requestId}` : ''}`);
      const next = draftSchema.parse(body.draft);
      if (body.provider === 'Meta' || body.provider === 'OpenAI') setModelProvider(body.provider);
      if (abort.signal.aborted || !mounted.current) return;
      if (typeof body.reply !== 'string') throw new Error('Invalid assistant response.');
      if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('You edited the form while I was thinking. Your edits are safe; send your answer again to continue from them.');
      if (body.changed) {
        const after = latest.current.onChange(next, expected);
        undo.current = [...undo.current.slice(-9), { draft: before, after }]; setUndoCount(undo.current.length);
        snapshot.current = after; setUpdated(true);
      } else snapshot.current = expected;
      draft.current = next;
      setNeedsEnglish(hasNonEnglishDraft(next));
      history.current = [...history.current.slice(-6), { role: 'user', text: message.slice(0, 1500) }, { role: 'assistant', text: body.reply.slice(0, 1500) }];
      spokenQuestion.current = body.reply;
      setQuestion(romanLetters(body.displayReply || body.reply)); setInput(''); setHeard(romanLetters(body.transcript || message));
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
      setUndoCount(undo.current.length); setQuestion(t('Last voice change undone. What would you like to change?', 'à¤ªà¤¿à¤›à¤²à¤¾ à¤¬à¤¦à¤²à¤¾à¤µ à¤¹à¤Ÿà¤¾ à¤¦à¤¿à¤¯à¤¾ à¤¹à¥ˆà¥¤ à¤…à¤¬ à¤•à¥à¤¯à¤¾ à¤¬à¤¦à¤²à¤¨à¤¾ à¤¹à¥ˆ?')); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not undo this change.'); }
  }
  const working = status === 'thinking';
  return <section lang="en" aria-label="Voice quotation assistant" className="rounded-2xl border border-orange-200 bg-orange-50/50 p-3 shadow-sm dark:border-orange-900 dark:bg-orange-950/10 sm:p-4">
    <div className="flex items-start gap-3">
      <button type="button" aria-label={status === 'paused' ? 'Start voice conversation' : 'Pause voice conversation'} disabled={!supported || working} onClick={() => { if (status !== 'paused') pause(); else { active.current = true; speak(spokenQuestion.current); } }} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm disabled:opacity-50 ${status === 'listening' ? 'animate-pulse ring-4 ring-orange-200 dark:ring-orange-900' : ''}`}>
        {working ? <Loader2 className="h-5 w-5 animate-spin" /> : status === 'paused' ? <Mic className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">{t('Quotation voice assistant', 'à¤•à¥‹à¤Ÿà¥‡à¤¶à¤¨ à¤µà¥‰à¤‡à¤¸ à¤¸à¤¹à¤¾à¤¯à¤•')}</h2><span role="status" className="text-xs text-muted-foreground">{status === 'thinking' ? t('Updating fields...', 'à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...') : status === 'listening' ? t('Listening...', 'à¤¸à¥à¤¨ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...') : status === 'speaking' ? t('Speaking...', 'à¤¬à¥‹à¤² à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...') : t('Ready', 'à¤¤à¥ˆà¤¯à¤¾à¤°')}</span></div>
        <p aria-label={`AI model: ${modelProvider}`} className="mt-0.5 text-[11px] text-muted-foreground">{modelProvider === 'Meta' ? 'Meta Spark' : 'OpenAI fallback'}</p>
        <p aria-live="polite" className="mt-1 text-sm">{question}</p>
        {heard && <p className="mt-1 truncate text-xs text-muted-foreground" title={heard}>You: {heard}</p>}
        {updated && <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-300">{t('Quotation fields updated below. You can edit them anytime.', 'à¤¨à¥€à¤šà¥‡ à¤•à¥‹à¤Ÿà¥‡à¤¶à¤¨ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤° à¤¦à¥€ à¤—à¤ˆ à¤¹à¥ˆà¥¤ à¤†à¤ª à¤‡à¤¸à¥‡ à¤¬à¤¦à¤² à¤­à¥€ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤')}</p>}
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label="Close voice assistant" className="h-8 w-8 shrink-0" onClick={onClose}><X className="h-4 w-4" /></Button>
    </div>
    {needsEnglish && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span>Existing quotation text needs English translation.</span><Button size="sm" variant="outline" disabled={status !== 'paused'} onClick={() => { active.current = false; void send('Translate all existing quotation section titles, product names, descriptions, project details and client names into English or Roman proper-name spellings. Preserve IDs, measurements, prices and pricing.'); }}>Convert existing text to English</Button></div>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={!supported || working} onClick={() => { if (status !== 'paused') pause(); else { active.current = true; listen(); } }}>{status === 'paused' ? <Mic className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{status === 'paused' ? t('Speak', 'à¤¬à¥‹à¤²à¤¿à¤') : t('Pause', 'à¤°à¥‹à¤•à¥‡à¤‚')}</Button>
      <QuestionPlayback text={spokenQuestion.current} language={language} disabled={working || status !== 'paused'} onStart={pause} />
      <Button type="button" size="sm" variant="ghost" disabled={!undoCount || status !== 'paused'} onClick={undoLast}><Undo2 className="h-4 w-4" />{t('Undo', 'à¤ªà¤¿à¤›à¤²à¤¾ à¤¬à¤¦à¤²à¤¾à¤µ à¤¹à¤Ÿà¤¾à¤à¤')}</Button>
      <label className="sr-only" htmlFor="voice-language">Speech language</label><select id="voice-language" value={language} disabled={status !== 'paused'} onChange={event => {
        const nextLanguage = event.target.value as VoiceLanguage;
        setLanguage(nextLanguage); spokenQuestion.current = initialQuestion(latest.current.getCurrentDraft(), nextLanguage); setQuestion(initialQuestion(latest.current.getCurrentDraft(), 'en-IN')); history.current = []; setSpeechNotice('');
        try { localStorage.setItem('quotation-voice-language', nextLanguage); } catch { /* Optional preference. */ }
      }} className="ml-auto rounded-md border bg-background px-2 py-1.5 text-xs"><option value="en-IN">English</option><option value="hi-IN">Hinglish</option></select>
    </div>
    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={reviewSpeech} disabled={status !== 'paused'} onChange={event => setReviewSpeech(event.target.checked)} />{t('Noisy surroundings: review each spoken answer before sending', 'à¤¶à¥‹à¤° à¤µà¤¾à¤²à¥€ à¤œà¤—à¤¹: à¤¹à¤° à¤¬à¥‹à¤²à¥‡ à¤¹à¥à¤ à¤œà¤µà¤¾à¤¬ à¤•à¥‹ à¤­à¥‡à¤œà¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤œà¤¾à¤à¤šà¥‡à¤‚')}</label>
    <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); active.current = false; stopAudio(); void send(input); }}>
      <label className="sr-only" htmlFor="voice-answer">Your answer</label><Input id="voice-answer" value={input} maxLength={3000} disabled={status !== 'paused'} onChange={event => setInput(event.target.value)} placeholder={t('Or type your answer or correction...', 'à¤¯à¤¾ à¤…à¤ªà¤¨à¤¾ à¤œà¤µà¤¾à¤¬ / à¤¸à¥à¤§à¤¾à¤° à¤²à¤¿à¤–à¤¿à¤...')} className="h-9 bg-background text-sm" />
      <Button type="submit" size="sm" disabled={!input.trim() || status !== 'paused'} aria-label="Send answer"><Send className="h-4 w-4" /></Button>
    </form>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{romanLetters(error)}</p>}
    {speechNotice && <p role="status" className="mt-2 text-xs text-muted-foreground">{romanLetters(speechNotice)}</p>}
    {!supported && <p className="mt-2 text-xs text-muted-foreground">{t('Voice recognition is unavailable in this browser. You can type your answers.', 'à¤‡à¤¸ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤®à¥‡à¤‚ à¤µà¥‰à¤‡à¤¸ à¤ªà¤¹à¤šà¤¾à¤¨ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ à¤…à¤ªà¤¨à¤¾ à¤œà¤µà¤¾à¤¬ à¤²à¤¿à¤– à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤')}</p>}

  </section>;
}
