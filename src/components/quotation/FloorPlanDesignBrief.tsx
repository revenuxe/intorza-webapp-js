'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { type ProjectBrief } from '@/lib/quotation-ai/floor-plan';
import { supabase } from '@/integrations/supabase/client';

export function FloorPlanDesignBrief({ brief, onChange }: { brief: ProjectBrief; onChange: (brief: ProjectBrief) => void }) {
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceError, setVoiceError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
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
  return <div>
    <fieldset className="rounded-2xl border bg-card p-3.5"><legend className="px-1 text-sm font-semibold">Explain it your way</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">Share must-haves, existing items to retain, finish preferences, or anything to leave out.</p><div className="mt-3 flex gap-2"><Textarea aria-label="Project requirements" value={brief.requestNotes ?? ''} maxLength={600} rows={4} placeholder="Example: Modern full home interior for a family. Keep the existing sofa. Add a compact pooja unit and a study desk. No false ceiling or wall painting." onChange={event => onChange({ ...brief, requestNotes: event.target.value })} /><button type="button" aria-label={voiceState === 'recording' ? 'Stop recording' : 'Record project requirements'} disabled={voiceState === 'transcribing'} onClick={voiceState === 'recording' ? stopVoice : startVoice} className={`flex w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${voiceState === 'recording' ? 'animate-pulse border-destructive bg-destructive text-destructive-foreground' : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'} disabled:opacity-50`}>{voiceState === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}</button></div><div className="mt-2 flex justify-between gap-3 text-[11px] text-muted-foreground"><span>{voiceState === 'recording' ? 'Recording… tap again to transcribe.' : voiceState === 'transcribing' ? 'Transcribing your note…' : 'Tap the microphone to speak instead of typing.'}</span><span>{(brief.requestNotes ?? '').length}/600</span></div>{voiceError && <p role="alert" className="mt-2 text-xs text-destructive">{voiceError}</p>}</fieldset>
  </div>;
}
