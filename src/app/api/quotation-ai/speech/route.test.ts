/** @jest-environment node */
import { POST } from './route';
import { createClient } from '@supabase/supabase-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: jest.fn() }));
const getUser = jest.fn(); const limit = jest.fn();
function request(payload: unknown = { text: 'चौड़ाई कितनी है?', language: 'hi-IN' }, auth = true) { return new Request('https://app.intorza.com/api/quotation-ai/speech', { method: 'POST', headers: { 'Content-Type':'application/json', ...(auth ? { Authorization: 'Bearer user-session' } : {}) }, body: JSON.stringify(payload) }); }
beforeEach(() => {
  jest.clearAllMocks(); (createClient as jest.Mock).mockReturnValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); limit.mockResolvedValue({ success: true });
  (getCloudflareContext as jest.Mock).mockResolvedValue({ env: { OPENAI_API_KEY: 'server-secret', QUOTATION_AI_LIMITER: { limit } } });
  global.fetch = jest.fn().mockResolvedValue(new Response(new Uint8Array([1,2,3]), { headers: { 'Content-Type':'audio/mpeg' } }));
});
describe('authenticated OpenAI speech', () => {
  it('requires login and a user rate limit before calling the provider', async () => {
    expect((await POST(request(undefined, false))).status).toBe(401);
    limit.mockResolvedValueOnce({ success: false }); expect((await POST(request())).status).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('generates Hindi MP3 without needing a device voice and keeps the key on the server', async () => {
    const response = await POST(request()); expect(response.status).toBe(200); expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]; expect(url).toBe('https://api.openai.com/v1/audio/speech');
    const body = JSON.parse(options.body); expect(body.model).toBe('gpt-4o-mini-tts'); expect(body.instructions).toContain('Hindi'); expect(body.input).toBe('चौड़ाई कितनी है?');
    expect(options.headers.Authorization).toBe('Bearer server-secret');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1,2,3]);
  });
  it('rejects oversized speech and invalid languages without spending tokens', async () => {
    expect((await POST(request({ text: 'x'.repeat(9000), language: 'en-IN' }))).status).toBe(413);
    expect((await POST(request({ text:'hello', language:'invalid' }))).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
