/** @jest-environment node */
import { POST } from './route';
import { createQuotationProvider } from '@/lib/quotation-ai/provider-factory';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ProviderError } from '@/lib/quotation-ai/provider';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@/lib/quotation-ai/provider-factory', () => ({ createQuotationProvider: jest.fn() }));
const propose = jest.fn();
const getUser = jest.fn();
const limit = jest.fn();
function input() { return {
  draft: { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' },
    pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] },
  message: 'For Rahul', language: 'en-IN', history: [],
}; }
function request(body: unknown = input(), authenticated = true) {
  return new Request('https://intorza.com/api/quotation-ai/turn', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer test-token' } : {}) }, body: JSON.stringify(body) });
}
beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser } });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'test-key', QUOTATION_AI_LIMITER: { limit } } });
  (createQuotationProvider as jest.Mock).mockReturnValue({ propose });
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  limit.mockResolvedValue({ success: true });
  propose.mockResolvedValue({ reply: 'What is the quotation title?', clarification: null, operations: [{ type: 'update_project', fields: { clientName: 'Rahul' } }] });
});
describe('authenticated quotation AI boundary', () => {
  it('selects OpenAI and prevents existing Hindi sections from surviving an accepted update', async () => {
    const payload = input(); payload.draft.sections[0].title = 'बेडरूम';
    const response = await POST(request(payload));
    expect(response.status).toBe(502); expect((await response.json()).code).toBe('AI_LANGUAGE_INVALID');
    expect(createQuotationProvider).toHaveBeenCalledWith({ provider: 'openai', apiKey: 'test-key', model: 'gpt-5.4-mini' });
  });
  it('returns a traceable safe upstream error without logging credentials or quotation text', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      propose.mockRejectedValueOnce(new ProviderError('Gemini temporarily unavailable', 502, 'GEMINI_UPSTREAM_FAILED', 503));
      const response = await POST(request()); const body = await response.json();
      expect(response.status).toBe(502);
      expect(body).toMatchObject({ code: 'GEMINI_UPSTREAM_FAILED', upstreamStatus: 503, requestId: expect.any(String) });
      expect(warning).toHaveBeenCalledWith('quotation_ai_failure', { requestId: body.requestId, code: body.code, upstreamStatus: 503 });
      expect(JSON.stringify(warning.mock.calls)).not.toContain('test-token');
      expect(JSON.stringify(warning.mock.calls)).not.toContain('For Rahul');
    } finally { warning.mockRestore(); }
  });
  it('requires a verified user before calling AI', async () => {
    expect((await POST(request(input(), false))).status).toBe(401);
    getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') });
    expect((await POST(request())).status).toBe(401);
    expect(propose).not.toHaveBeenCalled();
  });
  it('enforces user rate limits before any provider call', async () => {
    limit.mockResolvedValueOnce({ success: false });
    const response = await POST(request());
    expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('60');
    expect(limit).toHaveBeenCalledWith({ key: 'quotation-ai:owner' });
    expect(propose).not.toHaveBeenCalled();
  });
  it('rejects oversized and invalid drafts before spending tokens', async () => {
    expect((await POST(request({ ...input(), message: 'x'.repeat(70000) }))).status).toBe(413);
    const invalid = input(); invalid.draft.sections.push({ id: 'room', title: '', items: [] });
    expect((await POST(request(invalid))).status).toBe(400);
    expect(propose).not.toHaveBeenCalled();
  });
  it('applies validated operations and returns only a review draft without caching', async () => {
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(body.draft.project.clientName).toBe('Rahul'); expect(body.draft.revision).toBe(1);
    expect(body.review.missing).toContain('Quotation title'); expect(body.changed).toBe(true);
  });
  it('does not mutate a draft during a clarification even if AI supplied operations', async () => {
    propose.mockResolvedValueOnce({ reply: 'Updated', clarification: 'Which client?', operations: [{ type: 'update_project', fields: { clientName: 'Guessed' } }] });
    const body = await (await POST(request())).json();
    expect(body.draft.project.clientName).toBe(''); expect(body.changed).toBe(false); expect(body.reply).toBe('Which client?');
  });
  it('rejects stale item references as a whole batch', async () => {
    propose.mockResolvedValueOnce({ reply: 'Changed', clarification: null, operations: [{ type: 'update_project', fields: { clientName: 'Changed' } }, { type: 'remove_item', itemId: 'missing' }] });
    const response = await POST(request()); expect(response.status).toBe(502);
    expect((await response.json()).draft).toBeUndefined();
  });
});
