import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({ text: z.string().trim().min(1).max(1500), language: z.enum(['en-IN','hi-IN']) }).strict();
type Env = { OPENAI_API_KEY?: string; OPENAI_TTS_MODEL?: string; QUOTATION_AI_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> } };
const json = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const localUsage = new Map<string, { count: number; expires: number }>();
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json('Sign in to use spoken questions.', 401);
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user) return json('Sign in again to use spoken questions.',401);
    let env: Env = {};
    try { env = (await getCloudflareContext({ async: true })).env as unknown as Env; } catch { /* Local development. */ }
    if (env.QUOTATION_AI_LIMITER) {
      if (!(await env.QUOTATION_AI_LIMITER.limit({ key: `quotation-ai:${data.user.id}` })).success) return json('Voice usage limit reached. Please wait.',429);
    } else {
      if (process.env.NODE_ENV === 'production') return json('Speech rate limiting is not configured.',503);
      const now = Date.now(); for (const [key, value] of localUsage) if (value.expires <= now) localUsage.delete(key);
      const usage = localUsage.get(data.user.id) || { count: 0, expires: now + 60000 }; usage.count++; localUsage.set(data.user.id, usage);
      if (usage.count > 10) return json('Voice usage limit reached. Please wait.',429);
    }
    if (!request.headers.get('content-type')?.includes('application/json')) return json('JSON required.',415);
    const reader = request.body?.getReader(); if (!reader) return json('Missing body.',400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); return json('Speech request too large.',413); } chunks.push(value); }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input; try { input = schema.safeParse(JSON.parse(new TextDecoder().decode(bytes))); } catch { return json('Invalid JSON.',400); }
    if (!input.success) return json('Invalid speech request.',400);
    const key = (env.OPENAI_API_KEY || process.env.OPENAI_API_KEY)?.trim();
    if (!key) return json('Configure OPENAI_API_KEY as a Cloudflare runtime secret.',503);
    const response = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]), headers: { Authorization: `Bearer ${key}`, 'Content-Type':'application/json' }, body: JSON.stringify({ model: env.OPENAI_TTS_MODEL || process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: 'coral', input: input.data.text, response_format: 'mp3', instructions: input.data.language === 'hi-IN' ? 'Speak natural, clear conversational Hindi. Read the provided text exactly. Use a warm concise interviewer voice.' : 'Speak clear conversational Indian English. Read the provided text exactly.' }) });
    if (!response.ok) return json(response.status === 429 ? 'OpenAI speech quota or rate limit reached.' : 'OpenAI speech is unavailable. Check the server key, model and API billing.', response.status === 429 ? 429 : 502);
    return new Response(response.body, { headers: { 'Content-Type':'audio/mpeg','Cache-Control':'private, no-store' } });
  } catch { return json('Spoken question could not load. Read the English question and try again.',502); }
}
