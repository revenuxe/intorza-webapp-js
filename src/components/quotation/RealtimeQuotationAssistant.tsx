"use client";

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Send, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { validateRealtimeChange } from '@/lib/quotation-ai/realtime-tools';
import { initialQuestion, type VoiceLanguage } from '@/lib/quotation-ai/language';
import { VoiceQuotationAssistant, type VoiceAssistantProps } from './VoiceQuotationAssistant';
import { QuestionPlayback } from './QuestionPlayback';
import { GuidedQuotationAssistant } from './GuidedQuotationAssistant';

type ToolCall = { type: string; name?: string; call_id?: string; arguments?: string };
export function RealtimeQuotationAssistant(props: VoiceAssistantProps) {
  const [mode, setMode] = useState<'guided' | 'live' | 'economy'>('guided');
  if (mode === 'guided') return <GuidedQuotationAssistant {...props} onLive={() => setMode('live')} />;
  return mode === 'economy' ? <div><Button variant="ghost" size="sm" onClick={() => setMode('live')}>Switch to live conversation</Button><VoiceQuotationAssistant {...props} /></div>
    : <div><Button variant="ghost" size="sm" onClick={() => setMode('guided')}>Switch to guided field entry</Button><LiveAssistant {...props} onEconomy={() => setMode('economy')} /></div>;
}

function LiveAssistant({ initialDraft, getCurrentDraft, onChange, onClose, onEconomy }: VoiceAssistantProps & { onEconomy: () => void }) {
  const [language, setLanguage] = useState<VoiceLanguage>('en-IN');
  const [noisy, setNoisy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState(initialQuestion(initialDraft, 'en-IN'));
  const [spokenQuestion, setSpokenQuestion] = useState(initialQuestion(initialDraft, 'en-IN'));
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [updates, setUpdates] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const latest = useRef({ getCurrentDraft, onChange }); latest.current = { getCurrentDraft, onChange };
  const pc = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const currentDraft = useRef(initialDraft);
  const snapshot = useRef(JSON.stringify(initialDraft));
  const seen = useRef(new Set<string>());
  const applying = useRef(false);
  const responseActive = useRef(false);
  const responsePending = useRef(false);
  const undo = useRef<{ draft: VoiceDraft; after: string }[]>([]);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishing = useRef(false);

  function stop() {
    generation.current++;
    request.current?.abort(); request.current = null;
    if (idle.current) clearTimeout(idle.current);
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    if (connectionTimer.current) clearTimeout(connectionTimer.current);
    if (completionTimer.current) clearTimeout(completionTimer.current);
    finishing.current = false;
    const connection = pc.current; pc.current = null;
    const events = channel.current; channel.current = null;
    if (events) { events.onmessage = null; events.onclose = null; events.close(); }
    if (connection) { connection.onconnectionstatechange = null; connection.close(); }
    microphone.current?.getTracks().forEach(track => track.stop()); microphone.current = null;
    if (audio.current) { audio.current.pause(); audio.current.srcObject = null; audio.current = null; }
    applying.current = false;
    responseActive.current = false; responsePending.current = false;
    if (mounted.current) { setConnected(false); setStatus('Ready'); }
  }
  function fail(message: string) { stop(); if (mounted.current) setError(message); }
  function finish() { stop(); if (mounted.current) setStatus('Complete — review quotation'); }
  function emit(value: unknown) { if (channel.current?.readyState === 'open') channel.current.send(JSON.stringify(value)); }
  function respond(speakOnly = false) {
    if (applying.current || responseActive.current) { responsePending.current = true; return; }
    const narration = speakOnly && !responsePending.current;
    responsePending.current = false; responseActive.current = true;
    emit({ type: 'response.create', ...(narration ? { response: { tool_choice: 'none' } } : {}) });
  }
  function armIdle() {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => fail('Conversation paused after inactivity. Start again when ready.'), 60000);
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') stop(); });
    try { const saved = localStorage.getItem('quotation-voice-language'); if (saved === 'hi-IN') { setLanguage(saved); setSpokenQuestion(initialQuestion(currentDraft.current, saved)); } } catch { /* Optional preference. */ }
    return () => { mounted.current = false; stop(); data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', hide); };
    // The connection is owned by this mounted component and reads callbacks from refs.
  }, []);

  async function api(payload: unknown, signal: AbortSignal) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in to use live voice.');
    const response = await fetch('/api/quotation-ai/realtime', { method: 'POST', signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) throw new Error(`${body.error || 'Live voice request failed.'}${body.code ? ` [${body.code}]` : ''}${body.requestId ? ` Reference: ${body.requestId}` : ''}`);
    return body;
  }
  async function applyCalls(calls: ToolCall[], version: number, signal: AbortSignal) {
    if (applying.current) { fail('A new answer arrived while fields were updating. Please restart from the current quotation.'); return; }
    applying.current = true;
    try {
      for (const call of calls) {
        if (!call.call_id || seen.current.has(call.call_id)) continue;
        seen.current.add(call.call_id);
        if (seen.current.size > 100) throw new Error('Conversation limit reached. Start a fresh conversation.');
        if (call.name !== 'update_quotation' || !call.arguments || call.arguments.length > 65536) throw new Error('Invalid voice tool request.');
        const expected = snapshot.current;
        if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('The form was edited manually. Restart voice to use your latest changes.');
        const before = currentDraft.current;
        setStatus('Updating fields');
        // Unsaved form edits use the same pure validator as the server, without
        // another network/authentication hop for every spoken answer.
        const body = validateRealtimeChange(before, JSON.parse(call.arguments));
        if (version !== generation.current || signal.aborted) return;
        if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('Your manual edits are safe. Restart voice to continue from them.');
        const next = draftSchema.parse(body.draft);
        if (body.changed) {
          const after = latest.current.onChange(next, expected);
          undo.current = [...undo.current.slice(-9), { draft: before, after }];
          snapshot.current = after; setUndoCount(undo.current.length); setUpdates(count => count + 1);
        }
        currentDraft.current = next;
        setQuestion(body.displayReply); setSpokenQuestion(body.reply); setHeard(body.transcript);
        if (body.complete) {
          finishing.current = true; responsePending.current = false;
          microphone.current?.getTracks().forEach(track => track.stop());
          completionTimer.current = setTimeout(finish, 15000);
        }
        emit({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id,
          output: JSON.stringify({ success: true, draft: next, review: body.review, reply: body.reply, instruction: 'Speak this reply briefly in the selected language. Do not call the tool again until a new user answer.' }) } });
      }
      if (version === generation.current) { applying.current = false; respond(true); armIdle(); }
    } catch (failure) {
      if (!signal.aborted && version === generation.current) fail(failure instanceof Error ? failure.message : 'Quotation update failed.');
    } finally { if (version === generation.current) applying.current = false; }
  }
  async function start() {
    stop(); setError(''); setStatus('Connecting');
    const version = generation.current;
    const abort = new AbortController(); request.current = abort;
    connectionTimer.current = setTimeout(() => { if (version === generation.current) fail('Live voice connection timed out. Try again or use browser mode.'); }, 20000);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Live voice needs HTTPS and a browser with microphone support. Use browser mode or type instead.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (version !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone.current = stream;
      const before = latest.current.getCurrentDraft();
      const expected = JSON.stringify(before);
      if (expected !== snapshot.current) { currentDraft.current = before; snapshot.current = expected; undo.current = []; setUndoCount(0); }
      const secret = await api({ action: 'session', language, noisy, draft: currentDraft.current }, abort.signal);
      if (version !== generation.current) return;
      const peer = new RTCPeerConnection(); pc.current = peer;
      const player = new Audio(); player.autoplay = true; audio.current = player;
      peer.ontrack = event => { player.srcObject = event.streams[0]; void player.play().catch(() => { if (version === generation.current) fail('Audio playback was blocked. Start voice again to enable audio.'); }); };
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      const events = peer.createDataChannel('oai-events'); channel.current = events; seen.current.clear();
      events.onopen = () => {
        if (version !== generation.current) return;
        if (connectionTimer.current) clearTimeout(connectionTimer.current);
        setConnected(true); setStatus('Listening'); armIdle();
        sessionTimer.current = setTimeout(() => fail('Five-minute voice session finished. Your quotation is preserved; start again to continue.'), 300000);
        emit({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Begin the quotation interview. Ask the next missing question. Publish an English question through update_quotation first, with transcript "Voice conversation started" and no edits unless existing quotation text needs translation.' }] } });
        respond();
      };
      events.onmessage = event => {
        if (version !== generation.current) return;
        let value; try { value = JSON.parse(event.data); } catch { return; }
        if (value.type === 'input_audio_buffer.speech_started' && !finishing.current) { setStatus('Listening'); armIdle(); }
        if (value.type === 'input_audio_buffer.speech_stopped' && !finishing.current) setStatus('Thinking');
        if (value.type === 'input_audio_buffer.committed' && !finishing.current) respond();
        if (value.type === 'response.created') responseActive.current = true;
        if (value.type === 'output_audio_buffer.started') { setStatus('Speaking'); armIdle(); }
        if (value.type === 'output_audio_buffer.stopped' || value.type === 'output_audio_buffer.cleared') { if (finishing.current) finish(); else setStatus('Listening'); }
        // Never show raw Hindi audio transcripts. The validated tool publishes English text.
        if (value.type === 'response.done') {
          responseActive.current = false;
          if (value.response?.status === 'failed') { fail('OpenAI could not answer. Check API billing and Realtime model access.'); return; }
          if (value.response?.status !== 'completed') { if (responsePending.current) respond(); return; }
          const calls = (value.response?.output || []).filter((item: ToolCall) => item.type === 'function_call' && (!item.call_id || !seen.current.has(item.call_id)));
          if (calls.length > 1) { fail('The assistant proposed overlapping changes. Restart voice to continue safely.'); return; }
          if (calls.length) void applyCalls(calls, version, abort.signal);
          else if (responsePending.current) respond();
        }
        if (value.type === 'error') fail(`Live voice failed${typeof value.error?.code === 'string' ? ` [${value.error.code}]` : ''}. Restart or use browser mode.`);
      };
      events.onclose = () => { if (version === generation.current) fail('Live voice disconnected. Your quotation is preserved.'); };
      peer.onconnectionstatechange = () => { if (version === generation.current && ['failed', 'disconnected'].includes(peer.connectionState)) fail('Voice connection lost. Start again to continue.'); };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', signal: abort.signal,
        headers: { Authorization: `Bearer ${secret.value}`, 'Content-Type': 'application/sdp' }, body: offer.sdp });
      if (!answer.ok) throw new Error(`OpenAI voice connection failed (HTTP ${answer.status}). Check Realtime model access or use browser mode.`);
      const sdp = await answer.text();
      if (version !== generation.current) return;
      await peer.setRemoteDescription({ type: 'answer', sdp });
    } catch (failure) { if (version === generation.current) fail(failure instanceof Error ? failure.message : 'Could not start live voice.'); }
  }
  function undoLast() {
    const entry = undo.current.at(-1); if (!entry) return;
    try {
      if (JSON.stringify(latest.current.getCurrentDraft()) !== entry.after) throw new Error('The form was edited manually. Correct the fields directly to preserve those edits.');
      const after = latest.current.onChange(entry.draft, entry.after);
      currentDraft.current = entry.draft; snapshot.current = after; undo.current.pop();
      if (undo.current.length) undo.current[undo.current.length - 1].after = after;
      setUndoCount(undo.current.length); setQuestion('Last voice change undone. Start voice to continue.'); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not undo.'); }
  }
  const running = connected || status === 'Connecting';
  return <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20" aria-label="Quotation voice assistant">
    <div className="flex items-start gap-3">
      <button type="button" onClick={() => running ? stop() : void start()} aria-label={running ? 'Pause live conversation' : 'Start live conversation'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white ${connected ? 'ring-4 ring-orange-200 dark:ring-orange-900' : ''}`}>
        {running ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Quotation voice assistant <span className="ml-1 text-xs font-normal text-muted-foreground" role="status">{status}</span></h2>
        <p className="mt-1 text-sm" aria-live="polite">{question}</p>
        {heard && <p className="mt-1 text-xs text-muted-foreground">You: {heard}</p>}
        {updates > 0 && <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-300">Quotation fields updated below.</p>}
      </div>
      <Button variant="ghost" size="icon" aria-label="Close voice assistant" className="h-8 w-8" onClick={() => { stop(); onClose(); }}><X className="h-4 w-4" /></Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => running ? stop() : void start()}>{running ? 'Pause' : 'Start conversation'}</Button>
      <QuestionPlayback text={spokenQuestion} language={language} disabled={running} onStart={stop} />
      <Button size="sm" variant="ghost" disabled={running || !undoCount} onClick={undoLast}><Undo2 className="h-4 w-4" />Undo</Button>
      <select aria-label="Spoken language" disabled={running} value={language} onChange={event => { const value = event.target.value as VoiceLanguage; setLanguage(value); setSpokenQuestion(initialQuestion(currentDraft.current, value)); setQuestion(initialQuestion(currentDraft.current, 'en-IN')); try { localStorage.setItem('quotation-voice-language', value); } catch { /* Optional. */ } }} className="ml-auto rounded-md border bg-background px-2 py-1.5 text-xs"><option value="en-IN">English</option><option value="hi-IN">Hindi</option></select>
    </div>
    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={noisy} disabled={running} onChange={event => setNoisy(event.target.checked)} />Noisy surroundings</label>
    <form className="mt-2 flex gap-2" onSubmit={event => {
      event.preventDefault(); if (!connected || !input.trim() || applying.current || status !== 'Listening') return;
      emit({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: input.trim() }] } });
      respond(); setInput(''); setStatus('Thinking'); armIdle();
    }}><Input aria-label="Your answer or correction" placeholder="Or type an answer or correction..." maxLength={3000} value={input} onChange={event => setInput(event.target.value)} disabled={!connected} className="h-9 bg-background text-sm" /><Button size="sm" type="submit" aria-label="Send answer" disabled={!connected || !input.trim() || status !== 'Listening'}><Send className="h-4 w-4" /></Button></form>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    <p className="mt-2 text-xs text-muted-foreground">Speak naturally and interrupt to correct a detail. Hindi conversation keeps screen text and quotation fields in English. Review measurements and prices before saving; tax and discount changes need Apply pricing.</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>AI-generated voice · Live audio uses OpenAI API billing</span><button type="button" onClick={() => { stop(); onEconomy(); }} className="underline underline-offset-2">Use lower-cost browser mode</button></div>
  </section>;
}
