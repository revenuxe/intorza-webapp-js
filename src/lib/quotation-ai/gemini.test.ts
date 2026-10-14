/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
import { GeminiQuotationProvider } from './gemini';

describe('Gemini provider adapter', () => {
  it('reports billing errors without retrying or changing models', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 402 }));
    await expect(new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input)).rejects.toMatchObject({ code: 'GEMINI_PAYMENT_REQUIRED', status: 402 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps Flash-Lite selected instead of falling back to a different model', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(new GeminiQuotationProvider('secret', 'gemini-3.5-flash-lite').propose(input)).rejects.toThrow('gemini-3.5-flash-lite');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('gemini-3.5-flash-lite:generateContent');
  });
  const input = { draft: {} as never, message: 'Wardrobe', history: [], language: 'en-IN' };
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('uses a server header key and validates structured JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ reply: 'What size?', clarification: null, operations: [] }) }] } }] })));
    const result = await new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input);
    expect(result.reply).toBe('What size?');
    const [url, config] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain('secret'); expect(config.headers['x-goog-api-key']).toBe('secret');
    expect(JSON.parse(config.body).generationConfig.responseMimeType).toBe('application/json');
    expect(JSON.parse(config.body).generationConfig.responseJsonSchema).toBeDefined();
    expect(JSON.parse(config.body).generationConfig.responseFormat).toBeUndefined();
  });
  it('rejects truncated output and unsupported operations', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ reply: 'Done', clarification: null, operations: [{ type: 'save_quote' }] }) }] } }] })));
    const provider = new GeminiQuotationProvider('secret', 'gemini-3.8-flash');
    await expect(provider.propose(input)).rejects.toThrow('could not complete');
    await expect(provider.propose(input)).rejects.toThrow('invalid quotation');
  });
  it('never exposes upstream error bodies or retries quota failures', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('sensitive upstream details', { status: 429 }));
    await expect(new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input)).rejects.toThrow('usage limit');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([[404, 'gemini-2.0-flash is unavailable'], [403, 'permissions'], [400, 'request configuration']])('reports upstream %s without leaking its response body', async (status, expected) => {
    global.fetch = jest.fn().mockResolvedValue(new Response('private provider details', { status: status as number }));
    await expect(new GeminiQuotationProvider('secret', 'gemini-2.0-flash').propose(input)).rejects.toThrow(expected as string);
  });
  it('retries a transient 503 once and returns a traceable upstream status if it still fails', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 503 })));
    await expect(new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input)).rejects.toMatchObject({ code: 'GEMINI_UPSTREAM_FAILED', upstreamStatus: 503 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal).toBe((global.fetch as jest.Mock).mock.calls[1][1].signal);
  });
  it('identifies invalid keys from safe metadata without exposing Google error messages', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'private key details', details: [{ reason: 'API_KEY_INVALID' }] } }), { status: 400 }));
    await expect(new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input)).rejects.toMatchObject({ code: 'GEMINI_KEY_INVALID', upstreamStatus: 400 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('instructs natural Hindi and normalizes spoken digits before extraction', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ reply: 'प्रति वर्ग फुट कीमत कितनी है?', clarification: null, operations: [] }) }] } }] })));
    await new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose({ ...input, language: 'hi-IN', message: 'चौड़ाई ६ फीट' });
    const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(payload.systemInstruction.parts[0].text).toContain('साढ़े छह फीट = 6.5 feet');
    expect(payload.systemInstruction.parts[0].text).toContain('write reply and clarification in natural Hindi');
    expect(JSON.parse(payload.contents[0].parts[0].text).message).toBe('चौड़ाई 6 फीट');
  });
});
