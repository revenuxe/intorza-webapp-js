"use client";

import { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, Send, Volume2, X } from 'lucide-react';
import { prepareVoiceAudio } from '@/lib/quotation-ai/audio-compat';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { isFaithfulLanguageRepair, validateRealtimeChange } from '@/lib/quotation-ai/realtime-tools';
import { initialQuestion, type VoiceLanguage } from '@/lib/quotation-ai/language';
import type { VoiceAssistantProps } from './VoiceQuotationAssistant';
import { ProviderError } from '@/lib/quotation-ai/provider';


import { advanceGuided, guidedDefault, guidedPrompts, nextGuidedState, type GuidedState } from '@/lib/quotation-ai/guided-flow';

type ToolCall = { type: string; name?: string; call_id?: string; arguments?: string };
type RealtimeVoiceLanguage = VoiceLanguage | 'hi-IN-native';
const isNativeHindi = (language: RealtimeVoiceLanguage) => language === 'hi-IN-native';
const openingSpeech = (draft: VoiceDraft, language: RealtimeVoiceLanguage) => language === 'hi-IN' ? guidedPrompts[nextGuidedState(draft).step].hindi : initialQuestion(draft, isNativeHindi(language) ? 'hi-IN' : language);
const languageName = (language: RealtimeVoiceLanguage) => language === 'hi-IN' ? 'Hinglish' : isNativeHindi(language) ? 'Hindi' : 'English';
function emptyQuotationDraft(draft: VoiceDraft): VoiceDraft {
  return draftSchema.parse({ version: 1, revision: draft.revision + 1,
    project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' },
    pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 },
    sections: [{ id: draft.sections[0]?.id || crypto.randomUUID(), title: '', items: [] }],
  });
}
export function RealtimeQuotationAssistant({ initialDraft, getCurrentDraft, onChange, onClose }: VoiceAssistantProps) {
  const [language, setLanguage] = useState<RealtimeVoiceLanguage>(() => { try { const saved = localStorage.getItem('quotation-voice-language'); return saved === 'en-IN' || saved === 'hi-IN-native' || saved === 'hi-IN' ? saved : 'hi-IN'; } catch { return 'hi-IN'; } });
  const noisy = false;
  const [status, setStatus] = useState('Ready');
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState(initialQuestion(initialDraft, 'en-IN'));
  const [spokenQuestion, setSpokenQuestion] = useState(() => openingSpeech(initialDraft, language));
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const [, setUndoCount] = useState(0);
  const [fieldState, setFieldState] = useState<GuidedState>(() => nextGuidedState(initialDraft));
  const [fieldValue, setFieldValue] = useState(() => guidedDefault(nextGuidedState(initialDraft), initialDraft));
  const [holding, setHolding] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioBlockedRef = useRef(false);
  const replayRequested = useRef(false);
  const spokenCurrent = useRef(spokenQuestion); spokenCurrent.current = spokenQuestion;
  const conversationContext = useRef({ question: initialQuestion(initialDraft, 'en-IN'), heard: '' });
  const fieldStateCurrent = useRef(fieldState); fieldStateCurrent.current = fieldState;
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
  const languageFailures = useRef(0);
  const hasUserAnswer = useRef(false);
  const rejectedLanguageProposal = useRef<unknown>(null);
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

    audioBlockedRef.current = false; replayRequested.current = false;
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
    languageFailures.current = 0;
    rejectedLanguageProposal.current = null;
    responseActive.current = false; responsePending.current = false;
    if (mounted.current) { setConnected(false); setStatus('Ready'); setHolding(false); setAudioBlocked(false); }
  }
  function fail(message: string) { stop(); if (mounted.current) setError(message); }
  function hold() { stop(); if (mounted.current) { setHolding(true); setStatus('On hold'); setError(''); } }
  function restartConversation() {
    // This is an explicit destructive restart control: start a brand-new
    // quotation and conversation, retaining no field or model context.
    stop();
    const previous = latest.current.getCurrentDraft();
    const draft = emptyQuotationDraft(previous);
    const expected = JSON.stringify(previous);
    snapshot.current = latest.current.onChange(draft, expected);
    currentDraft.current = draft;
    const next = nextGuidedState(draft);
    conversationContext.current = { question: initialQuestion(draft, 'en-IN'), heard: '' };
    hasUserAnswer.current = false; undo.current = []; seen.current.clear();
    setHeard(''); setError(''); setFieldState(next); setFieldValue(guidedDefault(next, draft));
    setQuestion(initialQuestion(draft, 'en-IN')); setSpokenQuestion(openingSpeech(draft, language));
    queueMicrotask(() => { if (mounted.current) void startCurrent.current(); });
  }
  function finish() { hold(); }
  function emit(value: unknown) { if (channel.current?.readyState === 'open') channel.current.send(JSON.stringify(value)); }
  function repeatQuestion() {
    if (audioBlockedRef.current || !channel.current || applying.current || responseActive.current) { replayRequested.current = true; return; }
    replayRequested.current = false; responseActive.current = true; setStatus('Thinking');
    emit({ type: 'response.create', response: { tool_choice: 'none', instructions: `Read this question exactly, without adding or editing quotation details. Use ${languageName(language)}: ${spokenCurrent.current}` } });
    armIdle();
  }
  async function enableVoice() {
    const player = audio.current; if (!player) return;
    const version = generation.current;
    try {
      // Called directly by the tap handler, with no fetch before play().
      await player.play();
      if (version !== generation.current) return;
      audioBlockedRef.current = false; setAudioBlocked(false); setError('');
      microphone.current?.getTracks().forEach(track => { track.enabled = true; });
      repeatQuestion();
    } catch { if (version === generation.current) setError('Audio is still blocked. Check site sound permissions, then tap Enable voice.'); }
  }
  function respond(speakOnly = false) {
    if (applying.current || responseActive.current) { responsePending.current = true; return; }
    const narration = speakOnly && !responsePending.current;
    responsePending.current = false; responseActive.current = true;
    emit({ type: 'response.create', ...(narration ? { response: { tool_choice: 'none' } } : {}) });
  }
  function armIdle() {
    if (idle.current) clearTimeout(idle.current);
    // Close promptly when the user walks away. Resume restores the local draft
    // and current field without paying for an open, silent Realtime session.
    idle.current = setTimeout(hold, 30000);
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') stop(); });
    try { const saved = localStorage.getItem('quotation-voice-language'); if (saved === 'hi-IN' || saved === 'hi-IN-native' || saved === 'en-IN') { setLanguage(saved); setSpokenQuestion(openingSpeech(currentDraft.current, saved)); } } catch { /* Optional preference. */ }
    return () => { mounted.current = false; stop(); data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', hide); };
    // The connection is owned by this mounted component and reads callbacks from refs.
  }, []);

  async function api(payload: unknown, signal: AbortSignal) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Sign in to use live voice.');
    const response = await fetch('/api/quotation-ai/realtime', { method: 'POST', signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) throw new Error('Voice is temporarily unavailable. Please try again.');
    return body;
  }
  async function applyCalls(calls: ToolCall[], version: number, signal: AbortSignal) {
    if (applying.current) { fail('A new answer arrived while fields were updating. Please restart from the current quotation.'); return; }
    applying.current = true;
    let failedCallId: string | undefined;
    let rejectedProposal: unknown;
    try {
      for (const call of calls) {
        if (!call.call_id || seen.current.has(call.call_id)) continue;
        seen.current.add(call.call_id);
        failedCallId = call.call_id;
        if (seen.current.size > 100) throw new Error('Conversation limit reached. Start a fresh conversation.');
        if (call.name !== 'update_quotation' || !call.arguments || call.arguments.length > 65536) throw new Error('Invalid voice tool request.');
        const expected = snapshot.current;
        if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('The form was edited manually. Restart voice to use your latest changes.');
        const before = currentDraft.current;
        setStatus('Updating fields');
        // Unsaved form edits use the same pure validator as the server, without
        // another network/authentication hop for every spoken answer.
        rejectedProposal = JSON.parse(call.arguments);
        if (rejectedLanguageProposal.current && !isFaithfulLanguageRepair(rejectedLanguageProposal.current, rejectedProposal)) throw new Error('The translation retry changed quotation details. No fields changed. Please reconnect and repeat the answer.');
        const body = validateRealtimeChange(before, rejectedProposal, { allowEmptyTranscript: !hasUserAnswer.current, spokenLanguage: language });
        languageFailures.current = 0;
        rejectedLanguageProposal.current = null;
        if (version !== generation.current || signal.aborted) return;
        if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('Your manual edits are safe. Restart voice to continue from them.');
        const next = draftSchema.parse(body.draft);
        if (body.changed) {
          const after = latest.current.onChange(next, expected);
          undo.current = [...undo.current.slice(-9), { draft: before, after }];
          snapshot.current = after; setUndoCount(undo.current.length);
        }
        currentDraft.current = next;
        const inferred = nextGuidedState(next);
        const nextField = body.focus ? { ...inferred, step: body.focus } : inferred;
        // Prefer the most recently edited item so corrections stay in context.
        const previousItem = next.sections.flatMap(section => section.items).find(item => item.id === fieldStateCurrent.current.itemId);
        if (previousItem && !nextField.itemId) { nextField.itemId = previousItem.id; nextField.sectionId = next.sections.find(section => section.items.some(item => item.id === previousItem.id))?.id; }
        if (!nextField.itemId) { const section = next.sections.filter(section => section.items.length).at(-1); if (section) { nextField.sectionId = section.id; nextField.itemId = section.items.at(-1)!.id; } }
        // Move forward immediately after an explicit value. Corrections remain
        // possible through speech or the visible field; confirmations are saved
        // for the final quotation review only.
        setFieldState(nextField); setFieldValue(guidedDefault(nextField, next));
        setQuestion(body.displayReply); setSpokenQuestion(body.reply); setHeard(body.transcript);
        conversationContext.current = { question: body.displayReply, heard: body.transcript };
        if (body.complete) {
          finishing.current = true; responsePending.current = false;
          microphone.current?.getTracks().forEach(track => track.stop());
          completionTimer.current = setTimeout(finish, 15000);
        }
        emit({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id,
          output: JSON.stringify({ success: true, draft: next, review: body.review, nextFocus: nextField.step, reply: body.reply, instruction: 'Speak the provided reply briefly, then continue directly to nextFocus. Do not request confirmation for an ordinary field value. Only clarify ambiguity or ask for the final quotation review.' }) } });
      }
      if (version === generation.current) { applying.current = false; respond(true); armIdle(); }
    } catch (failure) {
      if (!signal.aborted && version === generation.current) {
        if (failure instanceof ProviderError && failure.code === 'AI_LANGUAGE_INVALID' && failedCallId && languageFailures.current < 1) {
          languageFailures.current++;
          rejectedLanguageProposal.current = rejectedProposal;
          applying.current = false; responsePending.current = false; setStatus('Translating answer');
          emit({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: failedCallId,
            output: JSON.stringify({ success: false, code: 'AI_LANGUAGE_INVALID', changed: false, instruction: `No fields changed. Retry the same rejected tool call ONCE. Translate displayReply and transcript into English sentences in Latin letters. Translate quotation text into English, Roman proper names only. Keep reply strictly in ${languageName(language)}. Preserve every numeric value, ID and user intent; do not add operations or facts. If there was no user answer, use empty transcript with no operations.` }) } });
          respond(); armIdle();
        } else if (failure instanceof ProviderError && (failure.code === 'AI_LANGUAGE_INVALID' || failure.code === 'AI_TOOL_INVALID')) {
          // A malformed/unclear model turn must never end a live conversation.
          // Keep the quotation untouched and ask for the same answer again.
          const retrySpeech = language === 'hi-IN'
            ? 'Mujhe jawab samajh nahi aaya. Ek baar phir bol dijiye.'
            : isNativeHindi(language)
              ? 'मुझे जवाब समझ नहीं आया। कृपया फिर से बताइए।'
              : 'I did not catch that. Please say it again.';
          const retryDisplay = 'I could not understand that answer. Please say it again.';
          languageFailures.current = 0;
          rejectedLanguageProposal.current = null;
          applying.current = false;
          responsePending.current = false;
          spokenCurrent.current = retrySpeech;
          conversationContext.current = { question: retryDisplay, heard: '' };
          setQuestion(retryDisplay); setSpokenQuestion(retrySpeech); setHeard(''); setError(''); setStatus('Listening');
          if (failedCallId) emit({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: failedCallId,
            output: JSON.stringify({ success: false, code: failure.code, changed: false, instruction: `No fields changed. The answer was unclear or could not be safely translated. Ask this exact question in ${languageName(language)} and wait for new user speech: ${retrySpeech}. Do not call update_quotation until the user provides a new answer.` }) } });
          repeatQuestion(); armIdle();
        } else {
          fail(failure instanceof ProviderError && failure.code === 'AI_LANGUAGE_INVALID' ? 'Could not translate that answer into English. Your fields are unchanged. Tap Reconnect and try again.' : failure instanceof Error ? failure.message : 'Quotation update failed.');
        }
      }
    } finally { if (version === generation.current) applying.current = false; }
  }
  async function start() {
    stop(); setError(''); setStatus('Connecting');
    hasUserAnswer.current = false;
    const version = generation.current;
    const abort = new AbortController(); request.current = abort;
    connectionTimer.current = setTimeout(() => { if (version === generation.current) fail('Live voice connection timed out. Please try again.'); }, 20000);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Live voice needs HTTPS and a browser with microphone support. Please use a browser with microphone support.');
      setStatus('Allow microphone');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (version !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone.current = stream;
      setStatus('Connecting');
      const before = latest.current.getCurrentDraft();
      const expected = JSON.stringify(before);
      if (expected !== snapshot.current) { currentDraft.current = before; snapshot.current = expected; undo.current = []; setUndoCount(0); const next = nextGuidedState(before); setFieldState(next); setFieldValue(guidedDefault(next, before)); }
      const secret = await api({ action: 'session', language, noisy, draft: currentDraft.current }, abort.signal);
      if (version !== generation.current) return;
      const peer = new RTCPeerConnection(); pc.current = peer;
      const player = new Audio(); player.autoplay = true; prepareVoiceAudio(player); audio.current = player;
      const requireAudioTap = () => {
        if (version !== generation.current || document.hidden) return;
        audioBlockedRef.current = true; setAudioBlocked(true); setStatus('Tap to enable voice');
        microphone.current?.getTracks().forEach(track => { track.enabled = false; });
      };
      player.onpause = requireAudioTap;
      player.onerror = () => { requireAudioTap(); if (version === generation.current) setError('Voice audio was interrupted. Tap Enable voice to retry.'); };
      peer.ontrack = event => {
        if (version !== generation.current) return;
        player.srcObject = event.streams[0] || new MediaStream([event.track]);
        void Promise.resolve(player.play()).catch(requireAudioTap);
      };
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      const events = peer.createDataChannel('oai-events'); channel.current = events; seen.current.clear();
      events.onopen = () => {
        if (version !== generation.current) return;
        if (connectionTimer.current) clearTimeout(connectionTimer.current);
        setConnected(true); setStatus('Listening'); armIdle();
        // A focused quotation conversation should be short. The saved draft and
        // field state make a fresh session cheaper than retaining a long history.
        sessionTimer.current = setTimeout(hold, 120000);
        emit({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ instruction: 'Start or resume the quotation interview from the current draft. If resuming, briefly acknowledge the user and repeat the current question; do not repeat completed fields. Publish the English question through update_quotation with no edits unless text needs translation.', previousQuestion: conversationContext.current.question, previousAnswer: conversationContext.current.heard, pendingFocus: fieldStateCurrent.current.step }) }] } });
        respond();
      };
      events.onmessage = event => {
        if (version !== generation.current) return;
        let value; try { value = JSON.parse(event.data); } catch { return; }
        if (value.type === 'input_audio_buffer.speech_started' && !finishing.current) { setStatus('Listening'); setHeard(''); armIdle(); }
        if (value.type === 'input_audio_buffer.speech_stopped' && !finishing.current) setStatus('Thinking');
        if (value.type === 'input_audio_buffer.committed' && !finishing.current) { hasUserAnswer.current = true; respond(); }
        if (value.type === 'response.created') responseActive.current = true;
        if (value.type === 'output_audio_buffer.started') { if (!audioBlockedRef.current) setStatus('Speaking'); armIdle(); }
        if (value.type === 'output_audio_buffer.stopped' || value.type === 'output_audio_buffer.cleared') { if (finishing.current) finish(); else if (!audioBlockedRef.current) setStatus('Listening'); }
        // Never show raw Hindi audio transcripts. The validated tool publishes English text.
        if (value.type === 'response.done') {
          responseActive.current = false;
          if (value.response?.status === 'failed') { fail('Voice is temporarily unavailable. Please try again.'); return; }
          if (value.response?.status !== 'completed') { if (responsePending.current) respond(); return; }
          const calls = (value.response?.output || []).filter((item: ToolCall) => item.type === 'function_call' && (!item.call_id || !seen.current.has(item.call_id)));
          if (calls.length > 1) { fail('The assistant proposed overlapping changes. Restart voice to continue safely.'); return; }
          if (calls.length) { replayRequested.current = false; void applyCalls(calls, version, abort.signal); }
          else if (responsePending.current) respond();
          else if (replayRequested.current && !audioBlockedRef.current) repeatQuestion();
        }
        if (value.type === 'error') fail(`Live voice failed${typeof value.error?.code === 'string' ? ` [${value.error.code}]` : ''}. Please restart the conversation.`);
      };
      events.onclose = () => { if (version === generation.current) fail('Live voice disconnected. Your quotation is preserved.'); };
      peer.onconnectionstatechange = () => { if (version === generation.current && ['failed', 'disconnected'].includes(peer.connectionState)) fail('Voice connection lost. Start again to continue.'); };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', signal: abort.signal,
        headers: { Authorization: `Bearer ${secret.value}`, 'Content-Type': 'application/sdp' }, body: offer.sdp });
      if (!answer.ok) throw new Error('Voice could not connect. Please try again.');
      const sdp = await answer.text();
      if (version !== generation.current) return;
      await peer.setRemoteDescription({ type: 'answer', sdp });
    } catch (failure) { if (version === generation.current) fail(failure instanceof Error && failure.name === 'NotAllowedError' ? 'Allow microphone access in your browser, then tap Start conversation.' : failure instanceof Error ? failure.message : 'Could not start live voice.'); }
  }
  const startCurrent = useRef(start); startCurrent.current = start;
  useEffect(() => {
    // One automatic start per mount, including React Strict Mode's effect replay.
    const timer = setTimeout(() => { if (mounted.current) void startCurrent.current(); }, 0);
    return () => clearTimeout(timer);
  }, []);
  const running = connected || status === 'Connecting' || status === 'Allow microphone';
  const focusedPrompt = guidedPrompts[fieldState.step];
  function enterField(value: string) {
    if (!connected || responseActive.current || applying.current) return;
    hasUserAnswer.current = true;
    try {
      const expected = snapshot.current;
      if (JSON.stringify(latest.current.getCurrentDraft()) !== expected) throw new Error('The main form changed. Pause and restart to use those edits.');
      const before = currentDraft.current;
      const result = advanceGuided(fieldState, before, value);
      if (result.changed) {
        const after = latest.current.onChange(result.draft, expected);
        snapshot.current = after; currentDraft.current = result.draft;
        undo.current = [...undo.current.slice(-9), { draft: before, after }]; setUndoCount(undo.current.length);
      }
      setFieldState(result.state); setFieldValue(guidedDefault(result.state, result.draft));
      emit({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ typedField: fieldState.step, entered: value, currentDraft: result.draft, nextFocus: result.state.step, instruction: 'This typed answer is already applied. Briefly acknowledge it and immediately ask the next field. Do not ask for confirmation.' }) }] } });
      respond(); setStatus('Thinking'); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update the field.'); }
  }
  return <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-orange-200 bg-background p-3 shadow-sm dark:border-orange-900" aria-label="Quotation voice assistant">
    <div className="flex items-center gap-2">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white ${connected ? 'ring-2 ring-orange-200 dark:ring-orange-900' : ''}`}><Mic className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Quotation assistant</h2><span className="text-xs text-muted-foreground" role="status">{holding ? 'On hold · microphone off' : status === 'Listening' ? 'Listening' : status}</span></div>
      <Button variant="ghost" size="icon" aria-label="Close voice assistant" className="h-8 w-8" onClick={() => { stop(); onClose(); }}><X className="h-4 w-4" /></Button>
    </div>
    <div aria-label="Current conversation" className="mt-3 rounded-xl bg-orange-50/70 px-3 py-2.5 dark:bg-orange-950/20"><p className="text-sm leading-relaxed" aria-live="polite">{question}</p>{heard && <p className="mt-1 truncate text-xs text-muted-foreground">You: {heard}</p>}</div>
    {connected && !finishing.current && fieldState.step !== 'review' && <div className="mt-2"><label htmlFor="conversation-field" className="sr-only">{focusedPrompt.label}</label>
      {focusedPrompt.choices ? <div className="flex flex-wrap gap-2">{focusedPrompt.choices.map(choice => <Button key={choice.value} type="button" size="sm" variant="outline" disabled={status !== 'Listening'} onClick={() => enterField(choice.value)}>{choice.label}</Button>)}</div>
        : <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (fieldState.step === 'sectionChoice') { emit({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Use section ${fieldValue}` }] } }); respond(); setStatus('Thinking'); } else enterField(fieldValue); }}><Input id="conversation-field" value={fieldValue} maxLength={focusedPrompt.numeric ? 20 : 1000} inputMode={focusedPrompt.numeric ? 'decimal' : 'text'} onChange={event => setFieldValue(event.target.value)} placeholder={focusedPrompt.numeric ? `Enter ${focusedPrompt.label.toLowerCase()}` : `Type ${focusedPrompt.label.toLowerCase()} or say it`} /><Button type="submit" size="sm" aria-label="Continue" disabled={status !== 'Listening' || !fieldValue.trim()}><Send className="h-4 w-4" /></Button></form>}
    </div>}
    <div className="mt-2 flex items-center gap-1">
      <Button type="button" size="sm" variant="ghost" aria-label="Clear quotation and restart AI" title="Clear quotation and restart AI" disabled={status === 'Connecting' || status === 'Allow microphone'} onClick={restartConversation}><RotateCcw className="h-4 w-4" /></Button>
      {running && <Button type="button" size="sm" variant="outline" onClick={hold}>Hold</Button>}
      {audioBlocked && <Button type="button" size="sm" onClick={() => void enableVoice()}><Volume2 className="h-4 w-4" />Enable voice</Button>}
      {connected && !audioBlocked && !finishing.current && <Button type="button" size="sm" variant="ghost" aria-label="Read question" onClick={repeatQuestion} disabled={status !== 'Listening'}><Volume2 className="h-4 w-4" /></Button>}
      {(!running) && <Button size="sm" variant="outline" onClick={() => void start()}>{holding ? 'Resume' : 'Reconnect'}</Button>}
      <select aria-label="Spoken language" disabled={status === 'Connecting' || status === 'Allow microphone'} value={language} onChange={event => { const value = event.target.value as RealtimeVoiceLanguage; if (running) hold(); setLanguage(value); setSpokenQuestion(openingSpeech(currentDraft.current, value)); setQuestion(initialQuestion(currentDraft.current, 'en-IN')); try { localStorage.setItem('quotation-voice-language', value); } catch { /* Optional preference. */ } }} className="ml-auto rounded-md border bg-background px-2 py-1.5 text-xs"><option value="en-IN">English</option><option value="hi-IN">Hinglish</option><option value="hi-IN-native">हिन्दी / Hindi</option></select>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </section>;
}
