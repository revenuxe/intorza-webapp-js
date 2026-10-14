import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { applyOperations, draftSchema, reviewDraft } from '@/lib/quotation-ai/domain';
import { createQuotationProvider } from '@/lib/quotation-ai/provider-factory';
import { ProviderError } from '@/lib/quotation-ai/provider';
import { hasNonEnglishDraft } from '@/lib/quotation-ai/english-output';

export const dynamic = 'force-dynamic';
const requestSchema = z.object({
  draft: draftSchema, message: z.string().trim().min(1).max(3000),
  language: z.enum(['en-IN', 'hi-IN']),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1500) }).strict()).max(8),
}).strict();
type RateLimiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
type AIEnvironment = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; QUOTATION_AI_LIMITER?: RateLimiter };
const localUsage = new Map<string, { count: number; expires: number }>();
async function allowed(userId: string, env: AIEnvironment) {
  if (env.QUOTATION_AI_LIMITER) return (await env.QUOTATION_AI_LIMITER.limit({ key: `quotation-ai:${userId}` })).success;
  // Production must have the distributed binding; local limits are development-only.
  if (process.env.NODE_ENV === 'production') throw new ProviderError('AI rate limiting is not configured on the server.', 503);
  const now = Date.now();
  for (const [key, value] of localUsage) if (value.expires <= now) localUsage.delete(key);
  const usage = localUsage.get(userId) ?? { count: 0, expires: now + 60000 };
  usage.count++;
  localUsage.set(userId, usage);
  return usage.count <= 10;
}
async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ProviderError('Send a JSON request.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ProviderError('Missing request body.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new ProviderError('Quotation request is too large.', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Invalid request body.', 400);
  } finally { reader.releaseLock(); }
}
function json(value: unknown, status = 200, serverTiming?: string) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store', ...(serverTiming ? { 'Server-Timing': serverTiming } : {}), ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json({ error: 'Sign in to create a quotation with AI.' }, 401);
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Your session expired. Please sign in again.' }, 401);
    let env: AIEnvironment = {};
    try { env = (await getCloudflareContext({ async: true })).env as unknown as AIEnvironment; } catch { /* Next.js local development has no Worker bindings. */ }
    if (!await allowed(data.user.id, env)) return json({ error: 'Please wait a minute before sending another message.' }, 429);
    const input = requestSchema.safeParse(await readBody(request));
    if (!input.success) return json({ error: 'The quotation request is invalid or exceeds the draft limits.' }, 400);
    // Validate uniqueness and the overall item limit before calling a paid service.
    try { applyOperations(input.data.draft, []); }
    catch { return json({ error: 'The quotation draft has duplicate identifiers or exceeds its item limits.' }, 400); }
    const key = (env.OPENAI_API_KEY || process.env.OPENAI_API_KEY)?.trim();
    const provider = createQuotationProvider({ provider: 'openai', apiKey: key, model: (env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini').trim() });
    const providerStarted = performance.now();
    const proposal = await provider.propose({ draft: input.data.draft, message: input.data.message, history: input.data.history.map(turn => ({ role: turn.role, text: turn.text })), language: input.data.language }, request.signal);
    const providerDuration = performance.now() - providerStarted;
    // A clarification never mutates state, even if the model also suggests edits.
    const operations = proposal.clarification ? [] : proposal.operations;
    let draft;
    try { draft = applyOperations(input.data.draft, operations); }
    catch { throw new ProviderError('The proposed change could not be validated. Please clarify the item or measurement.', 502, 'QUOTATION_CHANGE_INVALID'); }
    if (operations.length && hasNonEnglishDraft(draft)) throw new ProviderError('Some quotation text still needs English translation. No fields changed; use Convert existing text to English and try again.', 502, 'AI_LANGUAGE_INVALID');
    return json({ draft, reply: proposal.clarification || proposal.reply, displayReply: proposal.displayReply, transcript: proposal.transcript, review: reviewDraft(draft), changed: operations.length > 0 }, 200, `provider;dur=${providerDuration.toFixed(1)}, total;dur=${(performance.now() - started).toFixed(1)}`);
  } catch (error) {
    if (error instanceof ProviderError) {
      console.warn('quotation_ai_failure', { requestId, code: error.code, upstreamStatus: error.upstreamStatus, ...(error.providerCode ? { providerCode: error.providerCode } : {}), ...(error.providerRequestId ? { providerRequestId: error.providerRequestId } : {}) });
      const response = json({ error: error.message, code: error.code, requestId, upstreamStatus: error.upstreamStatus, providerCode: error.providerCode, providerRequestId: error.providerRequestId, retryAfterSeconds: error.retryAfterSeconds }, error.status);
      if (error.retryAfterSeconds) response.headers.set('Retry-After', String(error.retryAfterSeconds));
      else response.headers.delete('Retry-After');
      return response;
    }
    return json({ error: 'Could not process this turn. Your quotation has not changed.' }, 500);
  }
}
