/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
import { GeminiQuotationProvider } from './gemini';

describe('Gemini provider adapter', () => {
  const input = { draft: {} as never, message: 'Wardrobe', history: [], language: 'en-IN' };
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('uses a server header key and validates structured JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ reply: 'What size?', clarification: null, operations: [] }) }] } }] })));
    const result = await new GeminiQuotationProvider('secret', 'gemini-3.8-flash').propose(input);
    expect(result.reply).toBe('What size?');
    const [url, config] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain('secret'); expect(config.headers['x-goog-api-key']).toBe('secret');
    expect(JSON.parse(config.body).generationConfig.responseFormat.text.mimeType).toBe('application/json');
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
});
