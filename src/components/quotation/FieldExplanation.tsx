"use client";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { browserSpeechInput, type BrowserRecognition } from '@/lib/quotation-ai/browser-speech';
import type { VoiceLanguage } from '@/lib/quotation-ai/language';
import { QuestionPlayback } from './QuestionPlayback';
import { isEnglishScript } from '@/lib/quotation-ai/english-output';

export function FieldExplanation({ step, language, onStart, onFinish }: { step: string; language: VoiceLanguage; onStart: () => void; onFinish: () => void }) {
  const [result, setResult] = useState<{ display: string; speech: string } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const recognition = useRef<BrowserRecognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef(new Map<string, { display: string; speech: string }>());
  const version = useRef(0);
  const finishCurrent = useRef(onFinish); finishCurrent.current = onFinish;
  function stop() { version.current++; abort.current?.abort(); if (timer.current) clearTimeout(timer.current); const mic = recognition.current; recognition.current = null; if (mic) { mic.onend = null; mic.onresult = null; mic.onerror = null; mic.abort(); } }
  useEffect(() => { stop(); setResult(null); setStatus(''); setError(''); return stop; }, [step, language]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setResult(null); setStatus(''); finishCurrent.current(); } };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  async function explain(question = "I didn't understand. Explain what I should enter here.") {
    stop(); onStart(); setError(''); setResult(null); setStatus('Explaining…');
    const expected = version.current; const controller = new AbortController(); abort.current = controller;
    try {
      const key = `${language}:${step}:${question}`; let answer = cache.current.get(key);
      if (!answer) {
        const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error('Sign in to use AI help.');
        if (expected !== version.current || controller.signal.aborted) return;
        const response = await fetch('/api/quotation-ai/realtime', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18000)]), headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'explain', step, language, question }) });
        const body = await response.json(); if (!response.ok) throw new Error(body.upstreamStatus === 429 ? 'AI help is unavailable. Check API billing or try later.' : 'Could not explain this field. Try again.');
        if (typeof body.display !== 'string' || !body.display.trim() || !isEnglishScript(body.display) || typeof body.speech !== 'string' || !body.speech.trim()) throw new Error('Could not explain this field. Try again.');
        answer = body; cache.current.set(key, body); if (cache.current.size > 20) cache.current.delete(cache.current.keys().next().value!);
      }
      if (expected === version.current) { setResult(answer!); setStatus(''); }
    } catch (failure) { if (expected === version.current) { setStatus(''); setError(failure instanceof Error ? failure.message : 'AI help is unavailable.'); onFinish(); } }
  }
  function ask() {
    stop(); onStart(); setError(''); setResult(null);
    if (!browserSpeechInput.available()) { void explain(); return; }
    let text = '';
    try {
      const mic = browserSpeechInput.create(language); recognition.current = mic; setStatus('Ask your question…');
      mic.onresult = event => { if (recognition.current !== mic) return; text = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(' ').slice(0, 500); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => mic.stop(), 900); };
      mic.onend = () => { if (recognition.current !== mic) return; recognition.current = null; if (timer.current) clearTimeout(timer.current); if (text.trim()) void explain(text); else { setStatus(''); setError('Nothing heard. Tap Explain instead.'); onFinish(); } };
      mic.onerror = () => { stop(); setStatus(''); setError('Microphone unavailable. Tap Explain instead.'); onFinish(); };
      timer.current = setTimeout(() => mic.stop(), 8000); mic.start();
    } catch { stop(); setStatus(''); setError('Microphone unavailable. Tap Explain instead.'); onFinish(); }
  }
  return <div className="mt-2"><div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="ghost" disabled={!!status} onClick={() => void explain()}>Explain simply</Button><Button type="button" size="sm" variant="ghost" disabled={!!status} onClick={ask}>Ask by voice</Button>{status && <Button type="button" size="sm" variant="ghost" onClick={() => { stop(); setStatus(''); onFinish(); }}>Cancel</Button>}</div>{status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}{result && <div className="mt-1 text-sm"><p>{result.display}</p><QuestionPlayback text={result.speech} language={language} onStart={onStart} autoPlay /><Button size="sm" variant="ghost" onClick={() => { stop(); setResult(null); onFinish(); }}>Back to question</Button></div>}</div>;
}
