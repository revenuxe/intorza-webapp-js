import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json({ error: 'Sign in to transcribe a voice note.' }, 401);
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return json({ error: 'Please sign in again.' }, 401);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 5.5 * 1024 * 1024) return json({ error: 'Keep the voice note under 5 MB.' }, 413);
    const form = await request.formData();
    const audio = form.get('audio');
    if (!audio || typeof audio === 'string' || audio.size < 100 || audio.size > 5 * 1024 * 1024 || !/^audio\//i.test(audio.type)) return json({ error: 'Record a short audio note and try again.' }, 400);
    let env: { OPENAI_API_KEY?: string; OPENAI_TRANSCRIBE_MODEL?: string } = {};
    try { env = (await getCloudflareContext({ async: true })).env as typeof env; } catch { /* Local development. */ }
    const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) return json({ error: 'Voice transcription is not configured.' }, 503);
    const body = new FormData(); body.set('file', audio, audio.name || 'project-note.webm'); body.set('model', env.OPENAI_TRANSCRIBE_MODEL || process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'); body.set('language', 'en');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: body as unknown as BodyInit, signal: AbortSignal.timeout(45000) });
    if (!response.ok) return json({ error: 'Voice transcription is unavailable. You can type your requirement instead.' }, 502);
    const result = await response.json() as { text?: unknown };
    const text = typeof result.text === 'string' ? result.text.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
    if (!text) return json({ error: 'No clear speech was detected. Please try again or type your note.' }, 422);
    return json({ text });
  } catch {
    return json({ error: 'Could not transcribe this voice note. Please try again or type your note.' }, 422);
  }
}
