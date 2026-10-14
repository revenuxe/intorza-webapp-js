/** @jest-environment node */
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
jest.mock('server-only', () => ({}));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
const getUser = jest.fn(); const limit = jest.fn();
const draft = { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] };
function request(body: unknown, auth = true) { return new Request('https://app.intorza.com/api/quotation-ai/realtime', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer token' } : {}) }, body: JSON.stringify(body) }); }
function proposal(clientName = 'Rahul') {
  return { reply: 'What is the quotation title?', displayReply: 'What is the quotation title?', transcript: 'For Rahul', clarification: null, operationsJson: JSON.stringify([{ type: 'update_project', fields: { clientName } }]) };
}
beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'server-secret', QUOTATION_AI_LIMITER: { limit } } });
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ value: 'short-lived-secret', expires_at: 123 })));
});
describe('live voice server boundary', () => {
  it('explains a field with English display and Hindi speech, without draft mutation', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ display: 'Enter the width in feet, for example 6.5.', speech: 'चौड़ाई फीट में डालिए, जैसे छह दशमलव पाँच।' }) }] }] })));
    const response = await POST(request({ action: 'explain', step: 'widthFt', language: 'hi-IN', question: 'समझ नहीं आया' }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ display: 'Enter the width in feet, for example 6.5.' });
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body); expect(body.store).toBe(false); expect(body.instructions).toContain('Never change a quotation');
    expect(draft.project.clientName).toBe('');
  });
  it('requires authentication and enforces limits before minting credentials', async () => {
    const body = { action: 'session', language: 'hi-IN', noisy: false, draft };
    expect((await POST(request(body, false))).status).toBe(401);
    limit.mockResolvedValueOnce({ success: false }); expect((await POST(request(body))).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns only ephemeral credentials and configures Hindi, interruption and English tools', async () => {
    const response = await POST(request({ action: 'session', language: 'hi-IN', noisy: false, draft }));
    expect(await response.json()).toEqual({ value: 'short-lived-secret', expiresAt: 123 });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const config = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(config.expires_after.seconds).toBe(60);
    expect(config.session.model).toBe('gpt-realtime-2.1-mini');
    expect(config.session.instructions).toContain('friendly conversational Hinglish');
    expect(config.session.instructions).toContain('matlab');
    expect(config.session.instructions).toContain('never type your illustrative example');
    expect(config.session.audio.input.turn_detection).toMatchObject({ type: 'semantic_vad', create_response: false, interrupt_response: true });
    expect(config.session.tools[0].name).toBe('update_quotation');
    expect(config.session.tool_choice).toBe('required');
  });
  it('validates edits without another paid model call and suppresses clarification mutations', async () => {
    const response = await POST(request({ action: 'apply', draft, proposal: proposal() }));
    const result = await response.json(); expect(result.draft.project.clientName).toBe('Rahul'); expect(result.changed).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    const clarify = { ...proposal(), clarification: 'Which client?' };
    const unchanged = await (await POST(request({ action: 'apply', draft, proposal: clarify }))).json();
    expect(unchanged.changed).toBe(false); expect(unchanged.draft.project.clientName).toBe('');
  });
  it('rejects Hindi display/field text and invalid item references atomically', async () => {
    expect((await POST(request({ action: 'apply', draft, proposal: proposal('राहुल') }))).status).toBe(502);
    const invalid = proposal(); invalid.operationsJson = JSON.stringify([{ type: 'update_project', fields: { clientName: 'Rahul' } }, { type: 'remove_item', itemId: 'missing' }]);
    const response = await POST(request({ action: 'apply', draft, proposal: invalid }));
    expect(response.status).toBe(502); expect((await response.json()).draft).toBeUndefined();
    expect(draft.project.clientName).toBe(''); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects oversized input before spending credit', async () => {
    expect((await POST(request({ text: 'x'.repeat(140000) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});
