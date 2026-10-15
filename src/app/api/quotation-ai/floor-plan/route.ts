import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { analysisSchema, briefSchema, buildEstimate, mergeRoomEstimates, detectPlanType, MAX_PLAN_BYTES, MAX_PLAN_FILES, scopedRooms, type Estimate, type PriceEvidence } from '@/lib/quotation-ai/floor-plan';
import { draftSchema } from '@/lib/quotation-ai/domain';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { ProviderError } from '@/lib/quotation-ai/provider';

export const dynamic = 'force-dynamic';
type Env = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; OPENAI_FLOOR_PLAN_MODEL?: string; QUOTATION_AI_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> } };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const generation = z.object({ action: z.literal('generate'), projectId: z.string().uuid().nullable(), analysis: analysisSchema, brief: briefSchema, draft: draftSchema, regenerateRooms: z.array(z.string().min(1).max(150)).min(1).max(40).optional() }).strict();
class InputError extends Error { constructor(message: string, public status: number) { super(message); } }
// Bound bodies while streaming, including chunked requests without Content-Length.
async function boundedBody(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Request body is missing.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new InputError('Request is too large. Upload up to 3 files, 10 MB total.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Blob(chunks as BlobPart[]);
}
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json({ error: 'Sign in to build a quotation.' }, 401);
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return json({ error: 'Please sign in again.' }, 401);
    let env: Env = {};
    try { env = (await getCloudflareContext({ async: true })).env as unknown as Env; } catch { /* Local development. */ }
    if (!env.QUOTATION_AI_LIMITER && process.env.NODE_ENV === 'production') return json({ error: 'AI rate limiting is not configured.' }, 503);
    if (env.QUOTATION_AI_LIMITER && !(await env.QUOTATION_AI_LIMITER.limit({ key: `floor-plan:${user.id}` })).success) return json({ error: 'Please wait a minute before trying again.' }, 429);
    const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const model = env.OPENAI_FLOOR_PLAN_MODEL || process.env.OPENAI_FLOOR_PLAN_MODEL || env.OPENAI_MODEL || process.env.OPENAI_MODEL;
    if (!key || !model) return json({ error: 'Configure the server OPENAI_API_KEY and a vision-capable OPENAI_FLOOR_PLAN_MODEL.' }, 503);
    const provider = new OpenAIFloorPlanProvider(key, model);
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.startsWith('multipart/form-data')) {
      const body = await boundedBody(request, MAX_PLAN_BYTES + 65536);
      const form = await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
      const entries = form.getAll('files');
      if (!entries.length || entries.length > MAX_PLAN_FILES || entries.some(file => typeof file === 'string')) return json({ error: 'Select between 1 and 3 floor plan files.' }, 400);
      const files = await Promise.all((entries as File[]).map(async file => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return { bytes, mime: detectPlanType(bytes), name: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-120) || 'floor-plan' };
      }));
      if (new Set(files.map(file => file.name)).size !== files.length) return json({ error: 'Give each uploaded drawing a different file name.' }, 400);
      if (files.reduce((sum, file) => sum + file.bytes.length, 0) > MAX_PLAN_BYTES) return json({ error: 'Keep the total upload under 10 MB.' }, 413);
      const projectId = crypto.randomUUID();
      const paths: string[] = [];
      cleanup = () => db.storage.from('quotation-floor-plans').remove(paths);
      for (const [index, file] of files.entries()) {
        const path = `${user.id}/${projectId}/${index}-${file.name}`;
        const result = await db.storage.from('quotation-floor-plans').upload(path, file.bytes, { contentType: file.mime, upsert: false });
        if (result.error) throw new Error('Private plan storage is unavailable. Apply the floor plan database migration.');
        paths.push(path);
      }
      const analysis = await provider.analyse(files, request.signal);
      const saved = await db.from('quotation_plan_projects').insert({ id: projectId, user_id: user.id, files: paths.map((path, index) => ({ path, name: files[index].name, mime: files[index].mime })), analysis });
      if (saved.error) throw new Error('Could not save the plan analysis. Check the database migration.');
      cleanup = undefined;
      return json({ projectId, analysis });
    }
    if (!contentType.startsWith('application/json')) return json({ error: 'Use JSON or a floor plan upload.' }, 415);
    const body = await boundedBody(request, 131072);
    const parsed = generation.safeParse(JSON.parse(await body.text()));
    if (!parsed.success) return json({ error: 'Check the project details and selected rooms.' }, 400);
    const { projectId, analysis, brief, draft, regenerateRooms } = parsed.data;
    let previousEstimate: Estimate | null = null;
    if (!scopedRooms(analysis, brief).length) return json({ error: 'Select at least one room for this scope.' }, 400);
    if (projectId) {
      const existing = await db.from('quotation_plan_projects').select('id,estimate').eq('id', projectId).eq('user_id', user.id).maybeSingle();
      if (existing.error || !existing.data) return json({ error: 'This floor plan is not available to your account.' }, 403);
      previousEstimate = (existing.data as { estimate: Estimate | null }).estimate;
    }
    if (regenerateRooms && (!previousEstimate || regenerateRooms.some(name => !scopedRooms(analysis, brief).some(room => room.name === name)))) return json({ error: 'Select rooms from the current estimate to regenerate.' }, 400);
    // RLS and an explicit owner filter both apply. Pattern rates are historical, never approved.
    const [approved, history, profile] = await Promise.all([
      db.from('quotation_approved_rates').select('*').eq('user_id', user.id).eq('active', true).limit(100),
      db.from('item_usage_patterns').select('*').eq('user_id', user.id).order('last_used_at', { ascending: false }).limit(60),
      db.from('profiles').select('currency_code,country_code,measurement_system').eq('id', user.id).single(),
    ]);
    if (approved.error || history.error || profile.error) throw new Error('Could not load your pricing data. Check the floor plan database migration.');
    if (profile.data?.measurement_system === 'metric') return json({ error: 'This builder currently uses square-foot billing. Switch the quotation measurement setting to imperial before generating an estimate.' }, 422);
    const currency = profile.data?.currency_code || 'INR';
    const rates: PriceEvidence[] = (approved.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id), name: String(row.product_name).slice(0, 150), description: String(row.specification).slice(0, 1000), rate: Number(row.rate), unit: String(row.unit), source: 'approved' as const,
      currency: String(row.currency), location: String(row.location).slice(0, 150), verifiedAt: String(row.verified_at), sourceUrl: row.source_url ? String(row.source_url).slice(0, 2000) : null, inclusions: String(row.inclusions).slice(0, 600),
    })).filter(rate => rate.currency === currency && rate.unit === 'sqft' && Number.isFinite(rate.rate) && rate.rate >= 0 && rate.rate <= 10000000 && (!rate.location || rate.location.toLowerCase() === brief.location.toLowerCase()));
    for (const row of history.data ?? []) {
      const rate = row.preferred_rate ?? row.default_rate;
      if (rate == null || rate < 0 || rate > 10000000 || row.country_code !== profile.data?.country_code || rates.some(item => item.name.toLowerCase() === row.product_name.toLowerCase())) continue;
      rates.push({ id: row.id, name: row.product_name.slice(0, 150), description: (row.product_details || '').slice(0, 1000), rate, unit: 'sqft', source: 'historical', currency, location: '', verifiedAt: row.last_used_at || row.updated_at, sourceUrl: null, inclusions: 'Historical rate; specifications, location, GST and inclusions require review.' });
    }
    const requestedBrief = regenerateRooms ? { ...brief, roomNames: regenerateRooms } : brief;
    // Bound context cost. Full evidence remains server-side; the model only needs matching specifications and IDs.
    const rateContext = rates.slice(0, 60).map(({ id, name, description, unit, source }) => ({ id, name, description: description.slice(0, 400), unit, source }));
    const proposal = await provider.generate({ rooms: scopedRooms(analysis, requestedBrief), property: analysis.propertyType, brief: requestedBrief, rates: rateContext }, request.signal);
    let estimate = buildEstimate(proposal, analysis, requestedBrief, rates, draft);
    if (regenerateRooms && previousEstimate) estimate = mergeRoomEstimates(previousEstimate, estimate, regenerateRooms, rates);
    const id = projectId || crypto.randomUUID();
    const saved = projectId
      ? await db.from('quotation_plan_projects').update({ analysis, brief, estimate, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
      : await db.from('quotation_plan_projects').insert({ id, user_id: user.id, analysis, brief, estimate });
    if (saved.error) throw new Error('Could not store the estimate. Your quotation has not changed.');
    return json({ projectId: id, estimate });
  } catch (error) {
    if (cleanup) await cleanup().catch(() => undefined);
    if (error instanceof InputError) return json({ error: error.message, requestId }, error.status);
    if (error instanceof ProviderError) return json({ error: error.message, code: error.code, requestId }, error.status);
    if (error instanceof SyntaxError || error instanceof z.ZodError) return json({ error: 'The analysis could not be read safely. Check the plan or details and try again.', requestId }, 422);
    return json({ error: error instanceof Error && error.name !== 'AbortError' && error.name !== 'TimeoutError' ? error.message : 'Analysis took too long. Please try fewer pages.', requestId }, 422);
  }
}
