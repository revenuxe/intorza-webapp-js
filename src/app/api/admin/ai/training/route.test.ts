/** @jest-environment node */
import { GET, POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@/lib/quotation-ai/floor-plan-provider', () => ({ OpenAIFloorPlanProvider: jest.fn() }));
const getUser = jest.fn(); const rpc = jest.fn(); const limit = jest.fn(); const extract = jest.fn();
const upload = jest.fn(); const remove = jest.fn(); const insert = jest.fn(); const maybeSingle = jest.fn();
const from = jest.fn();
const extraction = { location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Bedroom', productName: 'Wardrobe', material: 'Laminate', specification: 'Printed spec', unit: 'sqft', quantity: 56, rate: 1400, tax: 'excluded', installationIncluded: true, page: 1, notes: '' }] };
function request(body?: unknown, auth = true) { return new Request('https://app.intorza.com/api/admin/ai/training', { method: body ? 'POST' : 'GET', headers: { ...(auth ? { Authorization: 'Bearer admin-session' } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
function pdf(bytes = '%PDF-1.7\nbody\n%%EOF') { const form = new FormData(); form.append('file', new File([bytes], 'quotation.pdf', { type: 'application/pdf' })); return new Request('https://app.intorza.com/api/admin/ai/training', { method: 'POST', headers: { Authorization: 'Bearer admin-session' }, body: form }); }
beforeEach(() => {
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });
  rpc.mockImplementation((name: string) => Promise.resolve(name === 'is_admin' ? { data: true, error: null } : { error: null }));
  from.mockImplementation(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }), ilike: jest.fn().mockReturnThis(), maybeSingle, insert }));
  maybeSingle.mockResolvedValue({ data: null, error: null }); insert.mockResolvedValue({ error: null });
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser }, rpc, from, storage: { from: () => ({ upload, remove }) } });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'secret', OPENAI_FLOOR_PLAN_MODEL: 'configured-model', QUOTATION_AI_LIMITER: { limit } } });
  limit.mockResolvedValue({ success: true });
  (OpenAIFloorPlanProvider as jest.Mock).mockReturnValue({ extractTrainingPDF: extract }); extract.mockResolvedValue(extraction);
});
it('requires valid server-verified administrator access for listing and uploads', async () => {
  expect((await GET(request(undefined, false))).status).toBe(401);
  rpc.mockResolvedValueOnce({ data: false }); expect((await GET(request())).status).toBe(403);
  rpc.mockResolvedValueOnce({ data: false }); expect((await POST(pdf())).status).toBe(403);
  expect(from).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
});
it('paginates both documents and aggregated prices and validates page numbers', async () => {
  const pageRequest = (query: string) => new Request(`https://app.intorza.com/api/admin/ai/training?${query}`, { headers: { Authorization: 'Bearer admin-session' } });
  expect((await GET(pageRequest('page=1'))).status).toBe(200);
  expect(from.mock.results[0].value.range).toHaveBeenCalledWith(50, 99);
  expect((await GET(pageRequest('kind=prices&page=2&search=wardrobe'))).status).toBe(200);
  expect(from).toHaveBeenLastCalledWith('ai_reference_price_catalogue');
  expect(from.mock.results[1].value.range).toHaveBeenCalledWith(100, 149);
  expect(from.mock.results[1].value.ilike).toHaveBeenCalledWith('product_name', '%wardrobe%');
  expect((await GET(pageRequest('page=-1'))).status).toBe(400);
});
it('rejects invalid PDF contents and rate-limits before processing', async () => {
  expect((await POST(pdf('<script>bad</script>'))).status).toBe(422);
  expect(upload).not.toHaveBeenCalled();
  limit.mockResolvedValueOnce({ success: false }); expect((await POST(pdf())).status).toBe(429);
});
it('stores source PDFs privately and extracted patterns as pending, never automatically approved', async () => {
  const response = await POST(pdf()); expect(response.status).toBe(200);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ uploaded_by: 'admin-id', extraction, object_path: expect.stringMatching(/^admin-id\//) }));
  expect((await response.json()).document.status).toBe('pending');
  expect(rpc).not.toHaveBeenCalledWith('review_ai_training', expect.anything());
});
it('deduplicates uploads before inference and cleans storage after failed extraction', async () => {
  maybeSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null });
  expect((await POST(pdf())).status).toBe(409); expect(extract).not.toHaveBeenCalled();
  extract.mockRejectedValueOnce(new Error('Unreadable'));
  expect((await POST(pdf())).status).toBe(422); expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^admin-id\//)]);
});
it('requires an anonymized review and publishes through an atomic admin RPC', async () => {
  const body = { id: '00000000-0000-4000-8000-000000000001', action: 'approve', extraction, confirmAnonymized: false };
  expect((await POST(request(body))).status).toBe(400);
  expect((await POST(request({ ...body, confirmAnonymized: true }))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('review_ai_training', expect.objectContaining({ p_confirm_anonymized: true, p_extraction: extraction }));
});
