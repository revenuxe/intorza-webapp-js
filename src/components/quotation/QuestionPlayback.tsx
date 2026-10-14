"use client";
import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceLanguage } from '@/lib/quotation-ai/language';

export function QuestionPlayback({ text, language, onStart, disabled = false, autoPlay = false }: { text: string; language: VoiceLanguage; onStart: () => void; disabled?: boolean; autoPlay?: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'blocked'>('idle');
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Blob>());
  const version = useRef(0);
  function release() {
    version.current++; abort.current?.abort();
    if (audio.current) { audio.current.onended = null; audio.current.onerror = null; audio.current.pause(); audio.current.removeAttribute('src'); audio.current = null; }
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
  }
  useEffect(() => { release(); setState('idle'); setError(''); return release; }, [text, language, disabled, autoPlay]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { release(); setState('idle'); } };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  async function play(player: HTMLAudioElement, expected: number) {
    try { await player.play(); if (expected === version.current) setState('playing'); }
    catch (failure) {
      if (expected !== version.current) return;
      if (failure instanceof Error && failure.name === 'NotAllowedError') { setState('blocked'); setError('Your browser needs a tap to play audio. Tap Play question.'); }
      else { release(); setState('idle'); setError('Question audio could not play. Try Read question again.'); }
    }
  }
  async function read(force = false) {
    if (!force && state === 'blocked' && audio.current) { setError(''); void play(audio.current, version.current); return; }
    if (!force && (state === 'loading' || state === 'playing')) { release(); setState('idle'); return; }
    onStart(); release(); setError(''); setState('loading');
    const expected = version.current;
    const controller = new AbortController(); abort.current = controller;
    try {
      const key = `${language}:${text}`;
      let blob = cache.current.get(key);
      if (!blob) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Sign in to hear the question.');
        if (expected !== version.current || controller.signal.aborted) return;
        const response = await fetch('/api/quotation-ai/speech', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ text, language }) });
        if (!response.ok) { const body = await response.json(); throw new Error(body.upstreamStatus === 429 ? 'Voice limit reached. Try later or use device voice.' : 'Question audio could not load. Try again.'); }
        blob = await response.blob();
        if (!blob.size) throw new Error('The speech service returned empty audio.');
        cache.current.set(key, blob);
        if (cache.current.size > 4) cache.current.delete(cache.current.keys().next().value!);
      }
      if (expected !== version.current || controller.signal.aborted) return;
      url.current = URL.createObjectURL(blob);
      const player = new Audio(url.current); audio.current = player;
      player.onended = () => { if (expected === version.current) { release(); setState('idle'); } };
      player.onerror = () => { if (expected === version.current) { release(); setState('idle'); setError('Question audio could not play. Try again.'); } };
      await play(player, expected);
    } catch (failure) { if (expected === version.current && !controller.signal.aborted) { release(); setState('idle'); setError(failure instanceof Error ? failure.message : 'Question audio could not load.'); } }
  }
  const readCurrent = useRef(read); readCurrent.current = read;
  useEffect(() => { if (autoPlay && !disabled) void readCurrent.current(true); }, [text, language, autoPlay, disabled]);
  return <div className="contents"><Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => void read()}>{state === 'playing' || state === 'loading' ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{state === 'blocked' ? 'Play question' : state === 'loading' ? 'Cancel loading' : state === 'playing' ? 'Stop reading' : 'Read question'}</Button>{error && <p role="alert" className="w-full text-xs text-destructive">{error}</p>}</div>;
}
