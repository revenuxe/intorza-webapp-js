"use client";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { draftSchema, type VoiceDraft } from '@/lib/quotation-ai/domain';
import { hasNonEnglishDraft, isEnglishScript } from '@/lib/quotation-ai/english-output';
import { browserSpeechInput, type BrowserRecognition } from '@/lib/quotation-ai/browser-speech';
import { romanLetters, type VoiceLanguage } from '@/lib/quotation-ai/language';

export function DescribeQuotation({ draft, language, onAccept, onClose }: { draft: VoiceDraft; language: VoiceLanguage; onAccept: (next: VoiceDraft, expected: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<{ draft: VoiceDraft; reply: string; transcript: string; changed: boolean } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const mic = useRef<BrowserRecognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);
  function stop() { version.current++; abort.current?.abort(); if (timer.current) clearTimeout(timer.current); const current = mic.current; mic.current = null; if (current) { current.onend = null; current.onerror = null; current.onresult = null; current.abort(); } }
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setListening(false); setBusy(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { stop(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  function capture() {
    stop(); setError(''); setProposal(null);
    try {
      if (!browserSpeechInput.available()) throw new Error('Voice is unavailable here. Type the details instead.');
      const current = browserSpeechInput.create(language); mic.current = current;
      current.onresult = event => { if (mic.current !== current) return; const answer = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' '); setText(answer.slice(0, 3000)); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => current.stop(), 1400); };
      current.onend = () => { if (mic.current !== current) return; mic.current = null; if (timer.current) clearTimeout(timer.current); setListening(false); };
      current.onerror = () => { stop(); setListening(false); setError('Could not hear clearly. Type or try again.'); };
      timer.current = setTimeout(() => current.stop(), 15000); current.start(); setListening(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Voice is unavailable.'); }
  }
  async function extract() {
    stop(); setBusy(true); setError(''); setProposal(null);
    const expected = version.current; const controller = new AbortController(); abort.current = controller;
    try {
      const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error('Sign in to use AI.');
      if (controller.signal.aborted) return;
      const response = await fetch('/api/quotation-ai/turn', { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ draft, message: text, language, history: [] }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.upstreamStatus === 429 ? 'AI limit reached. Try later or enter details one by one.' : 'Could not understand the details. Try again or use individual fields.');
      const next = draftSchema.parse(body.draft);
      if (hasNonEnglishDraft(next) || typeof body.displayReply !== 'string' || !isEnglishScript(body.displayReply) || typeof body.transcript !== 'string' || !isEnglishScript(body.transcript)) throw new Error('Please try again. Quotation text must stay English.');
      if (expected === version.current) setProposal({ draft: next, reply: body.displayReply, transcript: body.transcript, changed: body.changed });
    } catch (failure) { if (expected === version.current) setError(failure instanceof Error ? failure.message : 'AI is unavailable.'); }
    finally { if (expected === version.current) setBusy(false); }
  }
  return <div className="mt-3 rounded-xl border bg-background p-3"><p className="text-sm font-medium">Tell me the details together</p><p className="mt-1 text-xs text-muted-foreground">For example: Aslam, Bedroom wardrobe, 6 × 8 feet, 1,200 per sq ft.</p>
    <Textarea aria-label="Describe quotation details" value={romanLetters(text)} onChange={event => { setText(event.target.value); setProposal(null); }} maxLength={3000} disabled={busy || listening} placeholder="Type or speak in English or Hinglish…" className="mt-2 min-h-20" />
    <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={busy} variant="outline" onClick={() => { if (listening) { mic.current?.stop(); } else capture(); }}>{listening ? 'Done speaking' : 'Speak details'}</Button><Button size="sm" disabled={busy || listening || !text.trim()} onClick={() => void extract()}>{busy ? 'Understanding…' : 'Preview with AI'}</Button><Button size="sm" variant="ghost" onClick={() => { stop(); onClose(); }}>Use one field at a time</Button></div>
    {proposal && <div className="mt-3 text-sm"><p>{proposal.transcript}</p><p className="mt-1 text-muted-foreground">{proposal.reply}</p>{proposal.changed && <div className="mt-2 max-h-48 overflow-auto rounded-md border p-2 text-xs"><p>{proposal.draft.project.clientName} · {proposal.draft.project.projectTitle}</p>{proposal.draft.sections.map(section => <div key={section.id}><p className="mt-1 font-medium">{section.title}</p>{section.items.map(item => <p key={item.id}>{item.productName} · {item.productDetails} · {item.measurementMode === 'dimensions' ? `${item.widthFt ?? '?'} × ${item.heightFt ?? '?'} ft` : `${item.sftArea ?? '?'} sq ft`} · Rate: {item.ratePerSft ?? 'Not supplied'}</p>)}</div>)}<p className="mt-1">GST: {proposal.draft.pricing.gstEnabled ? `${proposal.draft.pricing.gstRate}%` : 'Off'} · Discount: {proposal.draft.pricing.enableSocialMediaDiscount ? proposal.draft.pricing.socialMediaDiscountRate : proposal.draft.pricing.discountPercentage}%</p></div>}{proposal.changed && <Button size="sm" className="mt-2" onClick={() => { try { onAccept(proposal.draft, JSON.stringify(draft)); } catch (failure) { setError(failure instanceof Error ? failure.message : 'The form changed. Try again.'); } }}>Use these details</Button>}</div>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
