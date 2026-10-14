/** @jest-environment node */
import { POST } from './route';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createClient } from '@supabase/supabase-js';
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/quotation-ai/gemini', () => ({ geminiResponseSchema: { properties: { operations: {} } } }));
const getUser = jest.fn(); const limit = jest.fn();
const draft = { version: 1, revision: 0, project: { clientName: '', projectTitle: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] };
function request(payload: unknown, token = true) { return new Request('https://app.intorza.com/api/quotation-ai/live', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer user-token' } : {}) }, body: JSON.stringify(payload) }); }
beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { GEMINI_API_KEY: 'permanent-secret', QUOTATION_AI_LIMITER: { limit } } });
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ name: 'auth_tokens/ephemeral' })));
});
describe('Live token and tool boundary', () => {
  it('authenticates and rate limits before issuing a token', async () => {
    expect((await POST(request({ action: 'session', draft, language: 'en-IN' }, false))).status).toBe(401);
    limit.mockResolvedValueOnce({ success: false });
    expect((await POST(request({ action: 'session', draft, language: 'en-IN' }))).status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('returns only a one-use short-lived constrained credential and no permanent key', async () => {
    const response = await POST(request({ action: 'session', draft, language: 'hi-IN' })); const result = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(result.token).toBe('auth_tokens/ephemeral'); expect(JSON.stringify(result)).not.toContain('permanent-secret');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/auth_tokens');
    expect(options.headers['x-goog-api-key']).toBe('permanent-secret');
    const token = JSON.parse(options.body); expect(token.uses).toBe(1);
    expect(token.liveConnectConstraints.model).toBe('models/gemini-3.8-live');
    expect(token.liveConnectConstraints.config.systemInstruction.parts[0].text).toContain('Speak natural Hindi');
    expect(Date.parse(token.expireTime) - Date.now()).toBeLessThanOrEqual(180000);
    expect(result.setup.generationConfig.responseModalities).toEqual(['AUDIO']);
  });
  it('validates tool changes without making an extra model call', async () => {
    const response = await POST(request({ action: 'tool', draft, expectedRevision: 0, operations: [{ type: 'update_project', fields: { clientName: 'Rahul' } }] }));
    expect((await response.json()).draft.project.clientName).toBe('Rahul'); expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rejects stale revisions, invalid operations and oversized bodies', async () => {
    expect((await POST(request({ action: 'tool', draft, expectedRevision: 1, operations: [] }))).status).toBe(409);
    expect((await POST(request({ action: 'tool', draft, expectedRevision: 0, operations: [{ type: 'save_quote' }] }))).status).toBe(400);
    expect((await POST(request({ message: 'x'.repeat(70000) }))).status).toBe(413);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('does not allow a transcription-only model to be used as the dialogue model', async () => {
    (getCloudflareContext as jest.Mock).mockResolvedValueOnce({ env: { GEMINI_API_KEY: 'secret', GEMINI_LIVE_MODEL: 'gemini-3.5-transcribe-live', QUOTATION_AI_LIMITER: { limit } } });
    const response = await POST(request({ action: 'session', draft, language: 'en-IN' }));
    expect((await response.json()).code).toBe('GEMINI_LIVE_MODEL_INVALID'); expect(global.fetch).not.toHaveBeenCalled();
  });
});
