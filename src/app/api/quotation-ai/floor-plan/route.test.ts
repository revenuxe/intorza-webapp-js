/** @jest-environment node */
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { OpenAIWebMarketPricing } from '@/lib/quotation-ai/market-pricing';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
import { buildEstimate, type Estimate } from '@/lib/quotation-ai/floor-plan';
import { defaultRoomWork } from '@/lib/quotation-ai/room-work';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@/lib/quotation-ai/floor-plan-provider', () => ({ OpenAIFloorPlanProvider: jest.fn() }));
jest.mock('@/lib/quotation-ai/market-pricing', () => ({ ...jest.requireActual('@/lib/quotation-ai/market-pricing'), OpenAIWebMarketPricing: jest.fn() }));
const research = jest.fn();
const getUser = jest.fn(); const limit = jest.fn(); const analyse = jest.fn(); const generate = jest.fn();
const upload = jest.fn(); const remove = jest.fn(); const from = jest.fn();
const eq = jest.fn(); const insert = jest.fn();
let projectExists = true;
let referenceRows: Record<string, unknown>[] = [];
let storedEstimate: Estimate | null = null;
let metricProfile = false;
let measurementUpdateFails = false;
const profileUpdate = jest.fn();
function database(table: string) {
  const result = { data: table === 'profiles' ? { id: 'owner', currency_code: 'INR', country_code: 'IN', measurement_system: metricProfile ? 'metric' : 'imperial' } : table === 'ai_reference_price_catalogue' ? referenceRows : [], error: null };
  let updatingProfile = false;
  const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn(function (...args: unknown[]) { eq(table, ...args); return chain; }),
    range: jest.fn((start: number, end: number) => Promise.resolve({ ...result, data: referenceRows.slice(start, end + 1) })), limit: jest.fn().mockResolvedValue(result), order: jest.fn().mockReturnThis(), single: jest.fn(() => Promise.resolve(updatingProfile && measurementUpdateFails ? { data: null, error: new Error('Denied') } : result)),
    maybeSingle: jest.fn().mockResolvedValue({ data: projectExists ? { id: 'project', estimate: storedEstimate } : null, error: null }),
    insert: jest.fn((row: unknown) => { insert(table, row); return Promise.resolve({ error: null }); }),
    update: jest.fn((body: unknown) => { if (table === 'profiles') { updatingProfile = true; profileUpdate(body); } return chain; }), then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
  };
  return chain;
}
function request(body: unknown, authenticated = true) {
  return new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer session' } : {}) }, body: JSON.stringify(body) });
}
const payload = () => ({ action: 'generate', projectId: null, analysis: planFixture(), brief: briefFixture(), draft: draftFixture() });
beforeEach(() => {
  jest.clearAllMocks(); projectExists = true; referenceRows = []; storedEstimate = null; metricProfile = false; measurementUpdateFails = false;
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'secret', OPENAI_FLOOR_PLAN_MODEL: 'configured-vision-model', QUOTATION_AI_LIMITER: { limit } } });
  from.mockImplementation(database);
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser }, from, storage: { from: () => ({ upload, remove }) } });
  (OpenAIFloorPlanProvider as jest.Mock).mockReturnValue({ analyse, generate });
  (OpenAIWebMarketPricing as jest.Mock).mockReturnValue({ research });
  research.mockResolvedValue({ rates: [], limitations: ['No comparable published rates found.'] });
  generate.mockResolvedValue(proposalFixture()); analyse.mockResolvedValue(planFixture());
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
});
it('completes stored estimates with validated measurements and no provider calls', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  const itemId = storedEstimate.draft.sections[0].items[0].id;
  const response = await POST(request({ action: 'complete', projectId: '00000000-0000-4000-8000-000000000001', changes: [{ itemId, widthFt: 8, heightFt: 7, ratePerSft: 1200 }] }));
  expect(response.status).toBe(200); expect((await response.json()).estimate.totals.total).toBe(75331.2);
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled();
  projectExists = false;
  expect((await POST(request({ action: 'complete', projectId: '00000000-0000-4000-8000-000000000001', changes: [{ itemId, widthFt: 8, heightFt: 7, ratePerSft: 1200 }] }))).status).toBe(403);
});
it('retries only pricing while preserving quotation item IDs and quantities', async () => {
  storedEstimate = buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
  research.mockResolvedValueOnce({ rates: [{ id: 'market-1', name: 'Wardrobe', description: 'Proposed wardrobe', rate: 1300, unit: 'sqft', currency: 'INR', location: 'Bengaluru', source: 'market_estimate', verifiedAt: '2026-10-15', sourceUrl: 'https://supplier.example/rates', inclusions: 'Installed, excluding GST' }], limitations: [] });
  const response = await POST(request({ ...payload(), action: 'retry_pricing', projectId: '00000000-0000-4000-8000-000000000001' }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(generate).not.toHaveBeenCalled(); expect(research).toHaveBeenCalledTimes(1);
  expect(result.estimate.draft.sections[0].items[0]).toMatchObject({ id: storedEstimate.draft.sections[0].items[0].id, sftArea: 56, ratePerSft: 1300 });
});
it('uses reviewed global quotation references before paid market research', async () => {
  referenceRows = [{ id: 'admin-rate', section: 'Bedroom', product_name: 'Wardrobe', material: 'Laminate', specification: 'Reviewed specification', unit: 'sqft', recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5, tax: 'excluded', installation_included: true, location: 'Bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10), source_page: 2, notes: '', project_type: 'Apartment' }];
  const proposal = proposalFixture(); proposal.sections[0].items[0].rateId = 'admin-rate'; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1400);
  expect(result.estimate.evidence[0].price.source).toBe('admin_reference');
  expect(research).not.toHaveBeenCalled();
  expect(generate).toHaveBeenCalledWith(expect.objectContaining({ reviewedPatterns: [expect.objectContaining({ product: 'Wardrobe' })] }), expect.anything());
});
it('automatically prices an empty catalogue using retrieved market evidence', async () => {
  research.mockResolvedValueOnce({ rates: [{ id: 'market-1', name: 'Wardrobe', description: 'Proposed wardrobe', rate: 1300, unit: 'sqft', currency: 'INR', location: 'Bengaluru', source: 'market_estimate', verifiedAt: '2026-10-15', sourceUrl: 'https://supplier.example/rates', inclusions: 'Installed, excluding GST' }], limitations: [] });
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBe(1300);
  expect(result.estimate.totals.subtotal).toBe(72800);
  expect(result.estimate.incomplete).toBe(false);
});
it('matches prices beyond the first catalogue page and outside the model context', async () => {
  const reference = { section: 'Bedroom', material: 'laminate', specification: 'reviewed specification', unit: 'sqft',
    recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5,
    tax: 'excluded', installation_included: true, location: 'bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10) };
  referenceRows = Array.from({ length: 500 }, (_, index) => ({ ...reference, id: `unrelated-${index}`, product_name: `Other ${index}` }));
  referenceRows.push({ ...reference, id: 'last-page', product_name: 'Wardrobe' });
  const proposal = proposalFixture(); proposal.sections[0].items[0].description = 'laminate. reviewed specification';
  proposal.sections[0].items[0].rateId = null; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.evidence[0].price).toMatchObject({ id: 'last-page', rate: 1400 });
  expect(research).not.toHaveBeenCalled();
});
it('generates large plans in small batches and includes every confirmed field despite sparse model output', async () => {
  const input = payload();
  input.analysis.rooms = Array.from({ length: 25 }, (_, index) => ({ ...planFixture().rooms[0], name: `Bedroom ${index + 1}` }));
  input.brief.roomNames = input.analysis.rooms.map(room => room.name);
  const brief = { ...input.brief, roomWork: input.analysis.rooms.map(room => defaultRoomWork(room, 'complete')) };
  generate.mockImplementation(async ({ rooms }) => ({ sections: [{ ...proposalFixture().sections[0], title: rooms[0].name, roomName: rooms[0].name }], assumptions: [] }));
  const response = await POST(request({ ...input, brief }));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(generate).toHaveBeenCalledTimes(7);
  expect(generate.mock.calls.every(([context]) => context.rooms.length <= 4)).toBe(true);
  expect(estimate.draft.sections).toHaveLength(25);
  expect(estimate.draft.sections.flatMap((section: { items: unknown[] }) => section.items)).toHaveLength(75);
  expect(estimate.scopeGaps).toEqual([]);
});
it('uses a labelled detail-based close reference when exact pricing and market evidence are missing', async () => {
  referenceRows = [{ id: 'close-reference', section: 'Bedroom', product_name: 'Wardrobe', material: 'Laminate', specification: '18mm plywood', unit: 'sqft',
    recent_rate: 1400, recent_low: 1200, recent_high: 1600, recent_source_count: 5, source_count: 5,
    tax: 'excluded', installation_included: true, location: 'bengaluru', currency: 'INR', price_date: new Date().toISOString().slice(0, 10) }];
  const proposal = proposalFixture(); proposal.sections[0].items[0].description = '18mm plywood laminate wardrobe with shelving';
  proposal.sections[0].items[0].rateId = null; generate.mockResolvedValueOnce(proposal);
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const { estimate } = await response.json();
  expect(estimate.evidence[0].price).toMatchObject({ rate: 1400, confidence: 'low', match: { type: 'close' } });
  expect(estimate.draft.sections[0].items[0].productDetails).toBe(proposal.sections[0].items[0].description);
});
it('preserves an editable pending estimate when research fails', async () => {
  research.mockRejectedValueOnce(new Error('timeout'));
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBeNull();
  expect(result.estimate.assumptions.join()).toContain('unavailable');
});
it('does not search when the city is unknown', async () => {
  const input = payload(); input.brief.location = 'Unknown';
  const response = await POST(request(input));
  expect(response.status).toBe(200); expect(research).not.toHaveBeenCalled();
  expect((await response.json()).estimate.assumptions.join()).toContain('city is unknown');
});
it('requires a valid user before touching storage, data or provider', async () => {
  expect((await POST(request(payload(), false))).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('expired') });
  expect((await POST(request(payload()))).status).toBe(401);
  expect(from).not.toHaveBeenCalled(); expect(OpenAIFloorPlanProvider).not.toHaveBeenCalled();
});
it('automatically switches metric profiles to imperial with owner-scoped persistence', async () => {
  metricProfile = true;
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect(profileUpdate).toHaveBeenCalledWith({ measurement_system: 'imperial' });
  expect(eq).toHaveBeenCalledWith('profiles', 'id', 'owner');
  expect(await response.json()).toMatchObject({ measurementSystem: 'imperial', measurementChanged: true });
});
it('does not generate mislabeled estimates if the automatic measurement switch fails', async () => {
  metricProfile = true; measurementUpdateFails = true;
  const response = await POST(request(payload()));
  expect(response.status).toBe(422);
  expect((await response.json()).error).toContain('automatically');
  expect(generate).not.toHaveBeenCalled(); expect(research).not.toHaveBeenCalled();
});
it('leaves an existing imperial setting alone', async () => {
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  expect(profileUpdate).not.toHaveBeenCalled();
});
it('enforces rate limits before reading a plan', async () => {
  limit.mockResolvedValueOnce({ success: false });
  expect((await POST(request(payload()))).status).toBe(429);
  expect(analyse).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
});
it('denies another account’s project before generating', async () => {
  projectExists = false;
  const response = await POST(request({ ...payload(), projectId: '00000000-0000-4000-8000-000000000001' }));
  expect(response.status).toBe(403); expect(eq).toHaveBeenCalledWith('quotation_plan_projects', 'user_id', 'owner');
  expect(generate).not.toHaveBeenCalled();
});
it('ignores arbitrary rates from the caller and stores tenant-scoped evidence', async () => {
  const response = await POST(request(payload()));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.estimate.incomplete).toBe(true);
  expect(result.estimate.draft.sections[0].items[0].ratePerSft).toBeNull();
  expect(insert).toHaveBeenCalledWith('quotation_plan_projects', expect.objectContaining({ user_id: 'owner' }));
  expect(eq).toHaveBeenCalledWith('item_usage_patterns', 'user_id', 'owner');
  expect(createClient).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ global: { headers: { Authorization: 'Bearer session' } } }));
});
it('rejects invalid messages and oversized chunked bodies before provider work', async () => {
  expect((await POST(request({ ...payload(), brief: { ...briefFixture(), budget: -1 } }))).status).toBe(400);
  const response = await POST(request({ padding: 'x'.repeat(1048577) }));
  expect(response.status).not.toBe(200); expect(generate).not.toHaveBeenCalled();
});
it('validates actual bytes and cleans up private uploads on analysis failure', async () => {
  const form = new FormData(); form.append('files', new File(['%PDF-1.7\ncontent\n%%EOF'], 'plan.pdf', { type: 'text/plain' }));
  analyse.mockRejectedValueOnce(new Error('Unreadable plan'));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(422);
  expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\//), expect.any(Uint8Array), expect.objectContaining({ contentType: 'application/pdf' }));
  expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner\//)]);
  expect(insert).not.toHaveBeenCalled();
});
it('rejects a renamed executable without storing it', async () => {
  const form = new FormData(); form.append('files', new File(['<script>bad</script>'], 'plan.png', { type: 'image/png' }));
  const response = await POST(new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: form }));
  expect(response.status).toBe(422); expect(upload).not.toHaveBeenCalled();
});
