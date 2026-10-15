'use client';

import { useRef, useState } from 'react';
import { Check, Mic, Sparkles, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { scopedRooms, type PlanAnalysis, type ProjectBrief } from '@/lib/quotation-ai/floor-plan';
import { roomWorkOptions } from '@/lib/quotation-ai/room-work';
import { supabase } from '@/integrations/supabase/client';

export function FloorPlanDesignBrief({ analysis, brief, onChange }: { analysis: PlanAnalysis; brief: ProjectBrief; onChange: (brief: ProjectBrief) => void }) {
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceError, setVoiceError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const rooms = scopedRooms(analysis, brief);
  const core = new Set(['base_cabinets', 'wall_cabinets', 'loft', 'wardrobe', 'tv_unit', 'crockery_unit', 'study_storage', 'vanity', 'utility_storage']);
  const extras = new Map<string, string>();
  for (const room of rooms) for (const option of roomWorkOptions(room, brief.scope)) if (!core.has(option.key)) extras.set(option.key, option.name);
  const selected = new Set(brief.quoteExtras ?? []);
  const stopVoice = () => recorder.current?.state === 'recording' && recorder.current.stop();
  const startVoice = async () => {
    setVoiceError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Voice recording is not supported in this browser.');
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks.current = [];
      const active = new MediaRecorder(stream.current, MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined);
      recorder.current = active;
      active.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      active.onstop = async () => {
        stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; recorder.current = null;
        const audio = new Blob(chunks.current, { type: active.mimeType || 'audio/webm' });
        if (audio.size < 100) { setVoiceState('idle'); setVoiceError('No audio was captured. Please try again.'); return; }
        setVoiceState('transcribing');
        try {
          const { data } = await supabase.auth.getSession();
          const form = new FormData(); form.set('audio', new File([audio], 'project-note.webm', { type: audio.type }));
          const response = await fetch('/api/quotation-ai/transcribe', { method: 'POST', headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}, body: form });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not transcribe the voice note.');
          onChange({ ...brief, requestNotes: [brief.requestNotes, result.text].filter(Boolean).join(brief.requestNotes ? ' ' : '').slice(0, 600) });
        } catch (error) { setVoiceError(error instanceof Error ? error.message : 'Could not transcribe the voice note.'); }
        finally { setVoiceState('idle'); }
      };
      active.start(); setVoiceState('recording');
    } catch (error) { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setVoiceError(error instanceof Error ? error.message : 'Could not start voice recording.'); }
  };
  const toggle = (key: string) => onChange({ ...brief, quoteExtras: selected.has(key) ? [...selected].filter(value => value !== key) : [...selected, key] });
  return <div className="space-y-5">
    <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card p-4 sm:p-5">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-background"><Sparkles className="h-5 w-5 text-primary" /></div><div><p className="text-sm font-semibold">Tell us what you want to create</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The plan gives us the rooms. Your choices tell us what belongs in the quotation.</p></div></div>
    </section>
    <fieldset className="rounded-2xl border bg-card p-3.5"><legend className="px-1 text-sm font-semibold">Explain it your way</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">Share must-haves, existing items to retain, finish preferences, or anything to leave out.</p><div className="mt-3 flex gap-2"><Textarea aria-label="Project requirements" value={brief.requestNotes ?? ''} maxLength={600} rows={4} placeholder="Example: Modern full home interior for a family. Keep the existing sofa. Add a compact pooja unit and a study desk. No false ceiling or wall painting." onChange={event => onChange({ ...brief, requestNotes: event.target.value })} /><button type="button" aria-label={voiceState === 'recording' ? 'Stop recording' : 'Record project requirements'} disabled={voiceState === 'transcribing'} onClick={voiceState === 'recording' ? stopVoice : startVoice} className={`flex w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${voiceState === 'recording' ? 'animate-pulse border-destructive bg-destructive text-destructive-foreground' : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'} disabled:opacity-50`}>{voiceState === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}</button></div><div className="mt-2 flex justify-between gap-3 text-[11px] text-muted-foreground"><span>{voiceState === 'recording' ? 'Recording… tap again to transcribe.' : voiceState === 'transcribing' ? 'Transcribing your note…' : 'Tap the microphone to speak instead of typing.'}</span><span>{(brief.requestNotes ?? '').length}/600</span></div>{voiceError && <p role="alert" className="mt-2 text-xs text-destructive">{voiceError}</p>}</fieldset>
    {!!extras.size && <fieldset><legend className="text-sm font-semibold">Add only what you need</legend><p className="mb-3 mt-1 text-xs leading-5 text-muted-foreground">Core work for your selected scope is included automatically. Select extra work to add it to the AI estimate.</p><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{[...extras].map(([key, name]) => <button key={key} type="button" aria-pressed={selected.has(key)} onClick={() => toggle(key)} className={`flex min-h-20 items-start justify-between gap-2 rounded-xl border p-3 text-left text-xs transition-colors ${selected.has(key) ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'bg-card hover:border-primary/35'}`}><span className="font-medium leading-5">{name}</span><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected.has(key) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>{selected.has(key) && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span></button>)}</div></fieldset>}
    <p className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">The estimate uses your approved pricing library. Any item without a supported price stays clearly marked for review instead of receiving an invented rate.</p>
  </div>;
}
