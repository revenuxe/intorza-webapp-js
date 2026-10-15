import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { detectPlanType, MAX_PLAN_BYTES } from '@/lib/quotation-ai/floor-plan';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { trainingReviewSchema } from '@/lib/quotation-ai/training';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function adminContext(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return { denied: json({ error: 'Administrator sign-in required.' }, 401) };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return { denied: json({ error: 'Please sign in again.' }, 401) };
  const admin = await db.rpc('is_admin');
  if (admin.error || admin.data !== true) return { denied: json({ error: 'Administrator access required.' }, 403) };
  return { db, user };
}
async function readBody(request: Request, max: number) {
  const reader = request.body?.getReader(); if (!reader) throw new Error('Missing request.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new Error('File too large. Maximum 10 MB.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return new Blob(chunks as BlobPart[]);
}
export async function GET(request: Request) {
  const ctx = await adminContext(request); if (ctx.denied) return ctx.denied;
  const result = await ctx.db.from('ai_training_documents').select('id,filename,status,extraction,created_at,reviewed_at').order('created_at', { ascending: false }).limit(50);
  if (result.error) return json({ error: 'Training library unavailable. Apply the admin AI migration.' }, 503);
  return json({ documents: result.data });
}
export async function POST(request: Request) {
  let cleanup: (() => Promise<unknown>) | undefined;
  try {
    const ctx = await adminContext(request); if (ctx.denied) return ctx.denied;
    let env: { OPENAI_API_KEY?: string; OPENAI_FLOOR_PLAN_MODEL?: string; OPENAI_MODEL?: string; QUOTATION_AI_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> } } = {};
    try { env = (await getCloudflareContext({ async: true })).env as unknown as typeof env; } catch { /* Local dev. */ }
    if (!env.QUOTATION_AI_LIMITER && process.env.NODE_ENV === 'production') return json({ error: 'AI rate limiting is not configured.' }, 503);
    if (env.QUOTATION_AI_LIMITER && !(await env.QUOTATION_AI_LIMITER.limit({ key: `admin-ai:${ctx.user.id}` })).success) return json({ error: 'Please wait a minute before trying again.' }, 429);
    const type = request.headers.get('content-type') ?? '';
    if (type.startsWith('application/json')) {
      const parsed = trainingReviewSchema.safeParse(JSON.parse(await (await readBody(request, 180000)).text()));
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Check the review details.' }, 400);
      const { id, action, extraction, confirmAnonymized } = parsed.data;
      const result = await ctx.db.rpc('review_ai_training', { p_id: id, p_action: action, p_extraction: extraction, p_confirm_anonymized: confirmAnonymized });
      if (result.error) return json({ error: 'Could not publish this review. Check its location, date and document status.' }, 422);
      return json({ success: true, status: action === 'approve' ? 'approved' : 'rejected' });
    }
    if (!type.startsWith('multipart/form-data')) return json({ error: 'Upload a PDF or submit a JSON review.' }, 415);
    const form = await new Response(await readBody(request, MAX_PLAN_BYTES + 65536), { headers: { 'Content-Type': type } }).formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || form.getAll('file').length !== 1) return json({ error: 'Choose one quotation PDF.' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectPlanType(bytes) !== 'application/pdf') return json({ error: 'Only quotation PDFs are supported.' }, 400);
    const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const model = env.OPENAI_FLOOR_PLAN_MODEL || process.env.OPENAI_FLOOR_PLAN_MODEL || env.OPENAI_MODEL || process.env.OPENAI_MODEL;
    if (!key || !model) return json({ error: 'Configure the server OpenAI key and vision model.' }, 503);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const duplicate = await ctx.db.from('ai_training_documents').select('id').eq('uploaded_by', ctx.user.id).eq('content_hash', hash).maybeSingle();
    if (duplicate.error) return json({ error: 'Training library unavailable. Apply the admin AI migration.' }, 503);
    if (duplicate.data) return json({ error: 'This PDF is already in the training library. Open its existing review.' }, 409);
    const id = crypto.randomUUID(); const path = `${ctx.user.id}/${id}.pdf`;
    const uploaded = await ctx.db.storage.from('ai-training-quotations').upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploaded.error) throw new Error('Private training storage unavailable. Check the migration.');
    cleanup = () => ctx.db.storage.from('ai-training-quotations').remove([path]);
    const extraction = await new OpenAIFloorPlanProvider(key, model).extractTrainingPDF(bytes, request.signal);
    const filename = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-150) || 'quotation.pdf';
    const saved = await ctx.db.from('ai_training_documents').insert({ id, uploaded_by: ctx.user.id, filename, object_path: path, content_hash: hash, extraction });
    if (saved.error) throw new Error('Could not save extracted patterns. Please retry.');
    cleanup = undefined;
    return json({ document: { id, filename, status: 'pending', extraction, created_at: new Date().toISOString() } });
  } catch (error) {
    if (cleanup) await cleanup().catch(() => undefined);
    return json({ error: error instanceof Error && !['AbortError','TimeoutError'].includes(error.name) ? error.message : 'Analysis timed out. Try a smaller quotation PDF.' }, 422);
  }
}
