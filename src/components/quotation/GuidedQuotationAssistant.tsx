"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { advanceGuided, guidedDefault, guidedPrompts, type GuidedState } from '@/lib/quotation-ai/guided-flow';
import { reviewDraft, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { romanLetters, selectSpeechVoice, type VoiceLanguage } from '@/lib/quotation-ai/language';
import type { VoiceAssistantProps } from './VoiceQuotationAssistant';
import { QuestionPlayback } from './QuestionPlayback';
import { FieldExplanation } from './FieldExplanation';

export function GuidedQuotationAssistant({ initialDraft, getCurrentDraft, onChange, onClose, onLive }: VoiceAssistantProps & { onLive: () => void }) {
  const [state, setState] = useState<GuidedState>({ step: 'clientName' });
  const [answer, setAnswer] = useState(guidedDefault({ step: 'clientName' }, initialDraft));
  const [language, setLanguage] = useState<VoiceLanguage>('en-IN');
  const [started, setStarted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paidVoice, setPaidVoice] = useState(true);
  const [helpActive, setHelpActive] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const current = useRef(initialDraft);
  const snapshot = useRef(JSON.stringify(initialDraft));
  const previous = useRef<{ state: GuidedState; draft: VoiceDraft }[]>([]);
  const latest = useRef({ getCurrentDraft, onChange }); latest.current = { getCurrentDraft, onChange };
  const field = useRef<HTMLInputElement | null>(null);
  const speechGeneration = useRef(0);
  const speechWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseSpeech = useCallback(() => { speechGeneration.current++; if (speechWatchdog.current) clearTimeout(speechWatchdog.current); window.speechSynthesis?.cancel(); }, []);
  const stopSpeech = useCallback(() => { releaseSpeech(); setSpeaking(false); }, [releaseSpeech]);
  function read(next: GuidedState, lang: VoiceLanguage = language) {
    stopSpeech(); setNotice('');
    if (paidVoice) return;
    const synthesis = window.speechSynthesis;
    const voice = synthesis && selectSpeechVoice(synthesis.getVoices(), lang);
    if (!synthesis || !voice || typeof SpeechSynthesisUtterance === 'undefined') { setNotice(`A ${lang === 'hi-IN' ? 'Hindi' : 'English'} device voice is unavailable. Read the English question, or enable optional OpenAI question audio.`); return; }
    const prompt = guidedPrompts[next.step];
    const utterance = new SpeechSynthesisUtterance(lang === 'hi-IN' ? prompt.hindi : prompt.english);
    utterance.voice = voice; utterance.lang = lang; utterance.rate = 1;
    const generation = speechGeneration.current;
    utterance.onstart = () => { if (generation === speechGeneration.current) { if (speechWatchdog.current) clearTimeout(speechWatchdog.current); setSpeaking(true); } };
    utterance.onend = () => { if (generation === speechGeneration.current) setSpeaking(false); };
    utterance.onerror = () => { if (generation === speechGeneration.current) { setSpeaking(false); setNotice('Device speech could not play. Enable optional OpenAI audio or read the question.'); } };
    synthesis.resume(); synthesis.speak(utterance);
    speechWatchdog.current = setTimeout(() => { if (generation === speechGeneration.current && !synthesis.speaking) { stopSpeech(); setNotice('Device speech did not start. Tap Read question again or enable optional OpenAI audio.'); } }, 4000);
  }
  useEffect(() => {
    try { const saved = localStorage.getItem('quotation-voice-language'); if (saved === 'hi-IN') setLanguage(saved); } catch { /* Optional preference. */ }
    const hide = () => { if (document.hidden) { stopSpeech(); setStarted(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { releaseSpeech(); document.removeEventListener('visibilitychange', hide); };
  }, [releaseSpeech, stopSpeech]);
  useEffect(() => { if (started) field.current?.focus(); }, [state, started]);
  function begin() {
    stopSpeech(); setError(''); setHelpActive(false);
    const draft = latest.current.getCurrentDraft();
    const expected = JSON.stringify(draft);
    if (expected !== snapshot.current) { current.current = draft; snapshot.current = expected; previous.current = []; setHistoryCount(0); setState({ step: 'clientName' }); setAnswer(guidedDefault({ step: 'clientName' }, draft)); }
    setStarted(true); read(expected === snapshot.current && previous.current.length ? state : { step: 'clientName' });
  }
  function submit(value: string) {
    try {
      if (JSON.stringify(latest.current.getCurrentDraft()) !== snapshot.current) throw new Error('You changed the main form. Pause and restart the guide to use those changes.');
      const before = current.current;
      const result = advanceGuided(state, before, value);
      setHelpActive(false);
      if (result.changed) snapshot.current = latest.current.onChange(result.draft, snapshot.current);
      previous.current = [...previous.current.slice(-49), { state, draft: before }]; setHistoryCount(previous.current.length);
      current.current = result.draft; setState(result.state); setAnswer(guidedDefault(result.state, result.draft)); setError('');
      read(result.state);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update this field.'); }
  }
  function back() {
    const entry = previous.current.at(-1); if (!entry) return;
    try {
      if (JSON.stringify(latest.current.getCurrentDraft()) !== snapshot.current) throw new Error('Your manual edits are safe. Restart the guide to continue.');
      snapshot.current = latest.current.onChange(entry.draft, snapshot.current);
      current.current = entry.draft; previous.current.pop(); setHistoryCount(previous.current.length); setHelpActive(false);
      setState(entry.state); setAnswer(guidedDefault(entry.state, entry.draft)); setError(''); read(entry.state);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not go back.'); }
  }
  const prompt = guidedPrompts[state.step];
  const choices = state.step === 'sectionChoice' ? [...current.current.sections.filter(section => section.title.trim()).map(section => ({ value: section.id, label: romanLetters(section.title) })), { value: 'new', label: 'Create a new section' }] : prompt.choices;
  const currentSection = current.current.sections.find(section => section.id === state.sectionId);
  const currentItem = currentSection?.items.find(item => item.id === state.itemId);
  const review = reviewDraft(current.current);
  return <section aria-label="Guided quotation assistant" className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900 dark:bg-orange-950/20">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white"><Mic className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Guided quotation <span role="status" className="ml-1 text-xs font-normal text-muted-foreground">{state.step === 'review' ? 'Ready to review' : speaking ? 'Speaking' : started ? 'Waiting for your input' : 'Ready'}</span></h2><p className="mt-1 text-sm" aria-live="polite">{prompt.english}</p></div><Button size="icon" variant="ghost" aria-label="Close quotation guide" onClick={() => { stopSpeech(); onClose(); }}><X className="h-4 w-4" /></Button></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => { if (started) { stopSpeech(); setStarted(false); } else begin(); }}>{started ? 'Pause guide' : 'Start guide'}</Button>
      {paidVoice ? <QuestionPlayback text={language === 'hi-IN' ? prompt.hindi : prompt.english} language={language} onStart={stopSpeech} autoPlay={started && !helpActive} disabled={helpActive} /> : <Button size="sm" variant="ghost" disabled={helpActive} onClick={() => read(state)}><Volume2 className="h-4 w-4" />Read question</Button>}
      <select aria-label="Spoken language" value={language} onChange={event => { const value = event.target.value as VoiceLanguage; stopSpeech(); setLanguage(value); try { localStorage.setItem('quotation-voice-language', value); } catch { /* Optional. */ } if (started) read(state, value); }} className="ml-auto rounded-md border bg-background px-2 py-1.5 text-xs"><option value="en-IN">English</option><option value="hi-IN">Hindi</option></select>
    </div>
    {started && state.step !== 'review' && <div className="mt-3 rounded-xl border bg-background p-3"><label htmlFor="guided-quotation-field" className="mb-2 block text-sm font-medium">{prompt.label}</label>
      {currentSection && <p className="mb-2 text-xs text-muted-foreground">Section: {romanLetters(currentSection.title) || 'Untitled'}{currentItem ? ` · Item: ${romanLetters(currentItem.productName) || 'Untitled'}` : ''}</p>}
      {choices ? <div className="flex flex-wrap gap-2" role="group" aria-label={prompt.label}>{choices.map(choice => <Button key={choice.value} size="sm" variant="outline" onClick={() => submit(choice.value)}>{choice.label}</Button>)}</div>
        : <form onSubmit={event => { event.preventDefault(); submit(answer); }} className="flex flex-wrap gap-2"><Input ref={field} id="guided-quotation-field" type="text" inputMode={prompt.numeric ? 'decimal' : 'text'} value={answer} maxLength={prompt.numeric ? 20 : state.step === 'side' ? 20 : 1000} onChange={event => setAnswer(event.target.value)} placeholder={prompt.numeric ? 'Enter a number' : 'Type in English letters'} className="min-w-0 flex-1" /><Button type="submit" size="sm">Next</Button>{prompt.optional && <Button type="button" size="sm" variant="ghost" onClick={() => submit('')}>Skip</Button>}</form>}
      {historyCount > 0 && <Button size="sm" variant="ghost" onClick={back} className="mt-2"><ArrowLeft className="h-4 w-4" />Back</Button>}
      <FieldExplanation key={`${state.step}:${language}:${started}`} step={state.step} language={language} onStart={() => { stopSpeech(); setHelpActive(true); }} onFinish={() => setHelpActive(false)} />
    </div>}
    {state.step === 'review' && <div className="mt-3 rounded-xl border bg-background p-3 text-sm"><p>{current.current.project.clientName} · {current.current.sections.filter(section => section.items.length).length} sections · {current.current.sections.reduce((sum, section) => sum + section.items.length, 0)} items</p><p className="mt-1 font-medium">Projected total: {review.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="mt-1 text-xs text-muted-foreground">Check the fields below, apply pricing, and review terms and payment details before saving.</p><Button size="sm" variant="ghost" onClick={back}>Back</Button><Button size="sm" variant="outline" onClick={() => { stopSpeech(); onClose(); }}>Review quotation below</Button></div>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="mt-2 text-xs text-muted-foreground">{notice}</p>}
    <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Voice options</summary><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={paidVoice} onChange={event => { stopSpeech(); setPaidVoice(event.target.checked); setNotice(''); }} />OpenAI voice (paid, AI-generated)</label><button type="button" className="mt-2 underline underline-offset-2" onClick={() => { stopSpeech(); onLive(); }}>Switch to live AI conversation</button></details>
  </section>;
}
