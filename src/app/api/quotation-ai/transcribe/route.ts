import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';
type Env = { MODEL_API_KEY?: string; META_BASE_URL?: string; META_STT_MODEL?: string; QUOTATION_AI_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> } };
const json = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });

// Audio reaches Meta only from this authenticated server boundary. The browser
// never receives MODEL_API_KEY and the endpoint accepts only short WAV turns.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json('Sign in to transcribe voice.', 401);
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user) return json('Sign in again to transcribe voice.', 401);
    let env: Env = {};
    try { env = (await getCloudflareContext({ async: true })).env as unknown as Env; } catch { /* Local development. */ }
    if (env.QUOTATION_AI_LIMITER && !(await env.QUOTATION_AI_LIMITER.limit({ key: `quotation-ai:${data.user.id}` })).success) return json('Voice usage limit reached. Please wait.', 429);
    const key = (env.MODEL_API_KEY || process.env.MODEL_API_KEY)?.trim();
    if (!key) return json('Meta voice transcription is not configured.', 503);
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) return json('Audio upload required.', 415);
    const form = await request.formData(); const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size < 44 || audio.size > 5_000_000 || !/wav/i.test(audio.type + audio.name)) return json('Send a short WAV recording.', 400);
    const upstream = new FormData();
    upstream.set('request', new Blob([JSON.stringify({ model: (env.META_STT_MODEL || process.env.META_STT_MODEL || 'muse-voice-transcribe-1.0').trim(), audioEncoding: 'WAV', mode: 'PUSH_TO_TALK', languageBias: ['English', 'Hindi'], keywords: ['quotation', 'square feet', 'square foot', 'GST', 'discount', 'rate', 'section'] })], { type: 'application/json' }));
    upstream.set('audio', audio, 'turn.wav');
    const response = await fetch(`${(env.META_BASE_URL || process.env.META_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '')}/asr/transcribe`, { method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]), headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, body: upstream });
    if (!response.ok) return json('Meta could not transcribe that recording. Please try again.', response.status === 429 ? 429 : 502);
    const body = await response.json();
    if (typeof body.transcript !== 'string' || !body.transcript.trim()) return json('No speech was detected. Please speak again.', 422);
    return Response.json({ transcript: body.transcript.slice(0, 3000), provider: 'Meta Voice Transcribe' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return json('Voice transcription could not complete. Please try again.', 502); }
}
