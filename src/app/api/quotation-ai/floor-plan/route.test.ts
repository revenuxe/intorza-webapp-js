/** @jest-environment node */
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { OpenAIFloorPlanProvider } from '@/lib/quotation-ai/floor-plan-provider';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@/lib/quotation-ai/floor-plan-provider', () => ({ OpenAIFloorPlanProvider: jest.fn() }));
const getUser = jest.fn(); const limit = jest.fn(); const analyse = jest.fn(); const generate = jest.fn();
const upload = jest.fn(); const remove = jest.fn(); const from = jest.fn();
const eq = jest.fn(); const insert = jest.fn();
let projectExists = true;
function database(table: string) {
  const result = { data: table === 'profiles' ? { currency_code: 'INR', country_code: 'IN' } : [], error: null };
  const chain = { select: jest.fn().mockReturnThis(), eq: jest.fn(function (...args: unknown[]) { eq(table, ...args); return chain; }),
    limit: jest.fn().mockResolvedValue(result), order: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue({ data: projectExists ? { id: 'project' } : null, error: null }),
    insert: jest.fn((row: unknown) => { insert(table, row); return Promise.resolve({ error: null }); }),
    update: jest.fn().mockReturnThis(), then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
  };
  return chain;
}
function request(body: unknown, authenticated = true) {
  return new Request('https://app.intorza.com/api/quotation-ai/floor-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer session' } : {}) }, body: JSON.stringify(body) });
}
const payload = () => ({ action: 'generate', projectId: null, analysis: planFixture(), brief: briefFixture(), draft: draftFixture() });
beforeEach(() => {
  jest.clearAllMocks(); projectExists = true;
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'secret', OPENAI_FLOOR_PLAN_MODEL: 'configured-vision-model', QUOTATION_AI_LIMITER: { limit } } });
  from.mockImplementation(database);
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser }, from, storage: { from: () => ({ upload, remove }) } });
  (OpenAIFloorPlanProvider as jest.Mock).mockReturnValue({ analyse, generate });
  generate.mockResolvedValue(proposalFixture()); analyse.mockResolvedValue(planFixture());
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
});
it('requires a valid user before touching storage, data or provider', async () => {
  expect((await POST(request(payload(), false))).status).toBe(401);
  getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('expired') });
  expect((await POST(request(payload()))).status).toBe(401);
  expect(from).not.toHaveBeenCalled(); expect(OpenAIFloorPlanProvider).not.toHaveBeenCalled();
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
  const response = await POST(request({ padding: 'x'.repeat(140000) }));
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
