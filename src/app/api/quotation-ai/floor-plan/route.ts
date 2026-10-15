import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { z } from 'zod';
import { analysisSchema, briefSchema, buildEstimate, completeEstimate, estimateCompletionSchema, generatedSchema, mergeRoomEstimates, preserveRefinedItems, detectPlanType, MAX_PLAN_BYTES, MAX_PLAN_FILES, scopedRooms, type Estimate, type PriceEvidence } from '@/lib/quotation-ai/floor-plan';
import { ensureRoomWorkCoverage } from '@/lib/quotation-ai/room-work';
import { draftSchema, itemCalculation } from '@/lib/quotation-ai/domain';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { ProviderError } from '@/lib/quotation-ai/provider';
import { MarketResearchError, OpenAIWebMarketPricing } from '@/lib/quotation-ai/market-pricing';
import { closeReferencePrice, matchingReferenceRate, normalizeReferenceText, referenceCity, unknownReferenceCity, referencePriceEvidence, type ReferencePrice } from '@/lib/quotation-ai/reference-pricing';

export const dynamic = 'force-dynamic';
type Env = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; OPENAI_FLOOR_PLAN_MODEL?: string; OPENAI_MARKET_MODEL?: string; QUOTATION_MARKET_RESEARCH?: string; QUOTATION_AI_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> } };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const generation = z.object({ action: z.enum(['generate','retry_pricing']), projectId: z.string().uuid().nullable(), analysis: analysisSchema, brief: briefSchema, draft: draftSchema, regenerateRooms: z.array(z.string().min(1).max(150)).min(1).max(40).optional() }).strict();
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
    const provider = new OpenAIFloorPlanProvider(key, model);
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.startsWith('multipart/form-data')) {
      if (!key || !model) return json({ error: 'Configure the server OPENAI_API_KEY and a vision-capable OPENAI_FLOOR_PLAN_MODEL.' }, 503);
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
    const body = await boundedBody(request, 1048576);
    const raw = JSON.parse(await body.text());
    if (raw.action === 'complete') {
      const completion = estimateCompletionSchema.safeParse(raw);
      if (!completion.success) return json({ error: 'Enter positive sizes and a valid rate.' }, 400);
      const stored = await db.from('quotation_plan_projects').select('estimate').eq('id', completion.data.projectId).eq('user_id', user.id).maybeSingle();
      if (stored.error || !stored.data?.estimate) return json({ error: 'This estimate is not available to your account.' }, 403);
      const estimate = completeEstimate(stored.data.estimate as Estimate, completion.data.changes);
      const saved = await db.from('quotation_plan_projects').update({ estimate, updated_at: new Date().toISOString() }).eq('id', completion.data.projectId).eq('user_id', user.id);
      if (saved.error) return json({ error: 'Could not save these measurements. Please retry.' }, 422);
      return json({ projectId: completion.data.projectId, estimate });
    }
    if (!key || !model) return json({ error: 'Configure the server OPENAI_API_KEY and a vision-capable OPENAI_FLOOR_PLAN_MODEL.' }, 503);
    const parsed = generation.safeParse(raw);
    if (!parsed.success) return json({ error: 'Check the project details and selected rooms.' }, 400);
    const { projectId, analysis, brief, draft, regenerateRooms, action } = parsed.data;
    let previousEstimate: Estimate | null = null;
    if (!scopedRooms(analysis, brief).length) return json({ error: 'Select at least one room for this scope.' }, 400);
    if (projectId) {
      const existing = await db.from('quotation_plan_projects').select('id,estimate').eq('id', projectId).eq('user_id', user.id).maybeSingle();
      if (existing.error || !existing.data) return json({ error: 'This floor plan is not available to your account.' }, 403);
      previousEstimate = (existing.data as { estimate: Estimate | null }).estimate;
    }
    if (regenerateRooms && (!previousEstimate || regenerateRooms.some(name => !scopedRooms(analysis, brief).some(room => room.name === name)))) return json({ error: 'Select rooms from the current estimate to regenerate.' }, 400);
    if (action === 'retry_pricing' && (!previousEstimate || regenerateRooms)) return json({ error: 'Open an existing estimate to retry its pricing.' }, 400);
    // RLS and an explicit owner filter both apply. Pattern rates are historical, never approved.
    const [approved, history, profile] = await Promise.all([
      db.from('quotation_approved_rates').select('*').eq('user_id', user.id).eq('active', true).limit(100),
      db.from('item_usage_patterns').select('*').eq('user_id', user.id).order('last_used_at', { ascending: false }).limit(60),
      db.from('profiles').select('currency_code,country_code,measurement_system').eq('id', user.id).single(),
    ]);
    if (approved.error || history.error || profile.error) throw new Error('Could not load your pricing data. Check the floor plan database migration.');
    // Plan dimensions and canonical rates already use feet/sqft. Persist the
    // matching display setting before generation rather than blocking users.
    const measurementChanged = profile.data?.measurement_system === 'metric';
    if (measurementChanged) {
      const updated = await db.from('profiles').update({ measurement_system: 'imperial' }).eq('id', user.id).select('id').single();
      if (updated.error || !updated.data) return json({ error: 'Could not switch to square-foot billing automatically. Please retry; your quotation is unchanged.' }, 422);
    }
    const currency = profile.data?.currency_code || 'INR';
    // The view aggregates all approved PDFs before pagination; never price from
    // an arbitrary first 60 source entries. Fetch every matching product group.
    const references: { data: ReferencePrice[]; error: unknown } = { data: [], error: null };
    for (let offset = 0; ; offset += 500) {
      const page = await db.from('ai_reference_price_catalogue').select('*')
        .eq('currency', currency)
        .order('id').range(offset, offset + 499);
      if (page.error) { references.error = page.error; references.data = []; break; }
      references.data.push(...(page.data ?? []).filter(row => unknownReferenceCity(brief.location) || referenceCity(row.location) === referenceCity(brief.location)));
      if ((page.data?.length ?? 0) < 500) break;
    }
    const rates: PriceEvidence[] = (approved.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id), name: String(row.product_name).slice(0, 150), description: String(row.specification).slice(0, 1000), rate: Number(row.rate), unit: String(row.unit), source: 'approved' as const,
      currency: String(row.currency), location: String(row.location).slice(0, 150), verifiedAt: String(row.verified_at), sourceUrl: row.source_url ? String(row.source_url).slice(0, 2000) : null, inclusions: String(row.inclusions).slice(0, 600),
    })).filter(rate => rate.currency === currency && rate.unit === 'sqft' && Number.isFinite(rate.rate) && rate.rate >= 0 && rate.rate <= 10000000 && (!rate.location || referenceCity(rate.location) === referenceCity(brief.location))
      && Date.now() >= Date.parse(rate.verifiedAt) && Date.now() - Date.parse(rate.verifiedAt) <= 90 * 86400000);
    const patternContext: { section: string; product: string; material: string; specification: string }[] = [];
    // Only admin-reviewed, anonymized global records are visible through this table's RLS.
    if (!references.error) for (const row of references.data ?? []) {
      if (row.currency !== currency) continue;
      patternContext.push({ section: String(row.section).slice(0, 150), product: String(row.product_name).slice(0, 150), material: String(row.material).slice(0, 300), specification: String(row.specification).slice(0, 600) });
    }
    rates.push(...referencePriceEvidence(references.data, currency, brief.location, true)
      .filter(row => !rates.some(rate => rate.source === 'approved' && normalizeReferenceText(rate.name) === normalizeReferenceText(row.name)
        && normalizeReferenceText(rate.description) === normalizeReferenceText(row.description))));
    const approvedIds = new Set(rates.map(rate => rate.id));
    for (const row of history.data ?? []) {
      const rate = row.preferred_rate ?? row.default_rate;
      if (rate == null || rate <= 0 || rate > 10000000 || row.country_code !== profile.data?.country_code || rates.some(item => item.name.toLowerCase() === row.product_name.toLowerCase())
        || !Number.isFinite(Date.parse(row.last_used_at || row.updated_at)) || Date.parse(row.last_used_at || row.updated_at) > Date.now() || Date.now() - Date.parse(row.last_used_at || row.updated_at) > 90 * 86400000) continue;
      rates.push({ id: row.id, name: row.product_name.slice(0, 150), description: (row.product_details || '').slice(0, 1000), rate, unit: 'sqft', source: 'historical', currency, location: '', verifiedAt: row.last_used_at || row.updated_at, sourceUrl: null, inclusions: 'Historical rate; specifications, location, GST and inclusions require review.' });
    }
    const requestedBrief = regenerateRooms ? { ...brief, roomNames: regenerateRooms } : brief;
    if (action !== 'retry_pricing') ensureRoomWorkCoverage({ sections: [], assumptions: [] }, scopedRooms(analysis, requestedBrief), requestedBrief);
    // Bound context cost. Full evidence remains server-side; the model only needs matching specifications and IDs.
    const relevanceTerms = normalizeReferenceText([
      brief.finish, ...scopedRooms(analysis, requestedBrief).map(room => room.kind),
      ...draft.sections.flatMap(section => section.items.map(item => `${item.productName} ${item.productDetails}`)),
    ].join(' ')).split(/\W+/).filter(term => term.length > 2);
    const score = (row: PriceEvidence) => (row.source === 'approved' ? 1000 : row.source === 'admin_reference' ? 100 : 0)
      + relevanceTerms.reduce((sum, term) => sum + (normalizeReferenceText(`${row.name} ${row.description}`).includes(term) ? 1 : 0), 0);
    const rankedRates = [...rates].sort((a, b) => score(b) - score(a));
    const rateContext = rankedRates.slice(0, 60).map(({ id, name, description, unit, source }) => ({ id, name, description: description.slice(0, 400), unit, source }));
    let proposal = action === 'retry_pricing' ? generatedSchema.parse({
      sections: draftSchema.parse(previousEstimate.draft).sections.map(section => ({ title: section.title,
        roomName: previousEstimate.roomSections.find(row => row.sectionId === section.id)?.roomName,
        items: section.items.map(item => ({ productName: item.productName, description: item.productDetails,
          rateId: matchingReferenceRate(rates, item.productName, item.productDetails)?.id ?? null,
          quantity: itemCalculation(item).area, measurementStatus: itemCalculation(item).area == null ? 'unknown' : 'estimated',
          measurementReason: previousEstimate.evidence.find(row => row.itemId === item.id)?.reason || 'Previous work measurement retained.',
        })),
      })), assumptions: [],
    }) : await (async () => {
      const rooms = scopedRooms(analysis, requestedBrief);
      const batches = Array.from({ length: Math.ceil(rooms.length / 4) }, (_, index) => rooms.slice(index * 4, index * 4 + 4));
      const results: ReturnType<typeof generatedSchema.parse>[] = [];
      // Small batches prevent response token limits from dropping later rooms.
      // Two requests at a time keep latency bounded without a provider burst.
      for (let index = 0; index < batches.length; index += 2) {
        const group = await Promise.all(batches.slice(index, index + 2).map(batch => provider.generate({
          rooms: batch, property: analysis.propertyType,
          brief: { ...requestedBrief, roomNames: batch.map(room => room.name), roomWork: requestedBrief.roomWork?.filter(answer => batch.some(room => room.name === answer.roomName)) },
          rates: rateContext, reviewedPatterns: patternContext.slice(0, 30),
        }, request.signal)));
        results.push(...group);
      }
      return generatedSchema.parse({ sections: results.flatMap(result => result.sections), assumptions: [...new Set(results.flatMap(result => result.assumptions))].slice(0, 20) });
    })();
    if (action !== 'retry_pricing') proposal = generatedSchema.parse(ensureRoomWorkCoverage(proposal, scopedRooms(analysis, requestedBrief), requestedBrief));
    const researchLimitations: string[] = [];
    if (references.error) researchLimitations.push('The admin reference library is unavailable; business and market pricing were used where possible.');
    // Match against the complete catalogue even when an item was outside the
    // bounded model context. Never swap material variants based on name alone.
    for (const section of proposal.sections) for (const item of section.items) {
      if (/Billing: (piece|lump_sum); price separately/i.test(item.description)) { item.rateId = null; continue; }
      // Validate the requested specification server-side, even if the model
      // supplied a real catalogue ID belonging to a different material variant.
      item.rateId = null;
      const match = matchingReferenceRate(rates, item.productName, item.description);
      if (match) item.rateId = match.id;
      else {
        const close = closeReferencePrice(rates, item.productName, item.description, currency, brief.location);
        if (close) { rates.push(close); approvedIds.add(close.id); item.rateId = close.id; }
      }
    }
    const products = [...new Map(proposal.sections.flatMap(section => section.items).filter(item => !approvedIds.has(item.rateId) && !/Billing: (piece|lump_sum); price separately/i.test(item.description))
      .map(item => [JSON.stringify([item.productName.trim().toLowerCase(), item.description.trim().toLowerCase()]), { name: item.productName, specification: item.description,
        ...(action === 'retry_pricing' ? { heightFt: previousEstimate.draft.sections.flatMap(section => section.items).find(row => row.productName === item.productName && row.productDetails === item.description)?.heightFt ?? undefined } : {}),
      }])).values()];
    const enabled = (env.QUOTATION_MARKET_RESEARCH || process.env.QUOTATION_MARKET_RESEARCH || 'openai') === 'openai';
    if (products.length && enabled && !/^(unknown|not set|n\/a|none)$/i.test(brief.location.trim())) {
      // Cache only this owner's previously saved evidence, at most 24h, with identical specification/currency/city.
      const cached = (action === 'retry_pricing' ? [] : previousEstimate?.evidence ?? []).flatMap(row => row.price?.source === 'market_estimate' ? [row.price] : [])
        .filter(rate => rate.currency === currency && rate.location.toLowerCase() === brief.location.toLowerCase()
          && Number.isFinite(Date.parse(rate.verifiedAt)) && Date.now() >= Date.parse(rate.verifiedAt) && Date.now() - Date.parse(rate.verifiedAt) < 86400000
          && products.some(product => product.name === rate.name && product.specification === rate.description));
      rates.push(...cached);
      const uncached = products.filter(product => !cached.some(rate => rate.name === product.name && rate.description === product.specification));
      for (let offset = 0; offset < uncached.length; offset += 12) {
        try {
          const research = await new OpenAIWebMarketPricing(key, env.OPENAI_MARKET_MODEL || process.env.OPENAI_MARKET_MODEL || model)
            .research({ products: uncached.slice(offset, offset + 12), location: brief.location, currency, finish: brief.finish }, request.signal);
          rates.push(...research.rates); researchLimitations.push(...research.limitations);
        } catch (failure) { researchLimitations.push(failure instanceof MarketResearchError ? failure.message : 'Live market research was unavailable. Available historical rates are labelled; other prices remain pending.'); }
      }
      if (cached.length) researchLimitations.push('Some market evidence is cached from this project within the last 24 hours; retrieval dates are shown.');
    } else if (products.length) researchLimitations.push('Live pricing research is disabled or the project city is unknown. Enter a city or review pending rates.');
    for (const section of proposal.sections) for (const item of section.items) {
      if (approvedIds.has(item.rateId)) continue;
      const researched = rates.find(rate => rate.source === 'market_estimate' && rate.name === item.productName && rate.description === item.description);
      if (researched) item.rateId = researched.id;
      else if (!/Billing: (piece|lump_sum); price separately/i.test(item.description)) {
        const close = closeReferencePrice(rates, item.productName, item.description, currency, brief.location);
        if (close) { rates.push(close); item.rateId = close.id; }
      }
    }
    let estimate = buildEstimate(proposal, analysis, requestedBrief, rates, draft);
    for (const section of estimate.draft.sections) for (const item of section.items) {
      const evidence = estimate.evidence.find(row => row.itemId === item.id);
      if (evidence && !evidence.price) evidence.reason = `${evidence.reason} Price pending: no supported exact or close specification match was found for this product in the selected city/currency. Confirm material, thickness, finish, hardware, installation and billing unit.`.slice(0, 600);
    }
    if (previousEstimate && action !== 'retry_pricing') estimate = preserveRefinedItems(previousEstimate, estimate, requestedBrief);
    if (action === 'retry_pricing') {
      // Keep stable identities and explicit manual rates/dimensions; only retry non-manual pricing.
      estimate.draft.sections.forEach((section, sectionIndex) => {
        const oldSection = previousEstimate.draft.sections[sectionIndex];
        const generatedSectionId = section.id; section.id = oldSection.id;
        estimate.roomSections.find(row => row.sectionId === generatedSectionId)!.sectionId = oldSection.id;
        section.items.forEach((item, itemIndex) => {
          const oldItem = oldSection.items[itemIndex];
          const row = estimate.evidence.find(row => row.itemId === item.id)!; row.itemId = oldItem.id; item.id = oldItem.id;
          const oldEvidence = previousEstimate.evidence.find(row => row.itemId === oldItem.id);
          if (oldEvidence?.price?.source === 'manual') { item.ratePerSft = oldItem.ratePerSft; row.price = oldEvidence.price; }
          if (oldItem.measurementMode === 'dimensions') { item.measurementMode = 'dimensions'; item.widthFt = oldItem.widthFt; item.heightFt = oldItem.heightFt; item.sftArea = null; if (oldEvidence) { row.quantityStatus = oldEvidence.quantityStatus; row.reason = oldEvidence.reason; } }
        });
      });
      estimate = completeEstimate(estimate, []);
    }
    estimate.assumptions.push(...researchLimitations);
    if (regenerateRooms && previousEstimate) estimate = mergeRoomEstimates(previousEstimate, estimate, regenerateRooms, rates);
    estimate.scopeGaps = scopedRooms(analysis, brief).map(room => room.name).filter(name => !estimate.roomSections.some(row => row.roomName === name));
    const id = projectId || crypto.randomUUID();
    const saved = projectId
      ? await db.from('quotation_plan_projects').update({ analysis, brief, estimate, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
      : await db.from('quotation_plan_projects').insert({ id, user_id: user.id, analysis, brief, estimate });
    if (saved.error) throw new Error('Could not store the estimate. Your quotation has not changed.');
    return json({ projectId: id, estimate, measurementSystem: 'imperial', measurementChanged });
  } catch (error) {
    if (cleanup) await cleanup().catch(() => undefined);
    if (error instanceof InputError) return json({ error: error.message, requestId }, error.status);
    if (error instanceof ProviderError) return json({ error: error.message, code: error.code, requestId }, error.status);
    if (error instanceof SyntaxError || error instanceof z.ZodError) return json({ error: 'The analysis could not be read safely. Check the plan or details and try again.', requestId }, 422);
    return json({ error: error instanceof Error && error.name !== 'AbortError' && error.name !== 'TimeoutError' ? error.message : 'Analysis took too long. Please try fewer pages.', requestId }, 422);
  }
}
