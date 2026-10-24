/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
import { OpenAIQuotationProvider, openAIResponseSchema } from './openai';
import { createQuotationProvider } from './provider-factory';
const input = { draft: {} as never, message: 'अलमारी', language: 'hi-IN', history: [] };
const blank = Object.fromEntries(Object.keys(openAIResponseSchema.properties.operations.items.properties.fields.properties).map(key => [key, null]));
const output = (operations: unknown[] = []) => ({ reply: 'इसकी चौड़ाई कितनी है?', clarification: null, displayReply: 'What is its width?', transcript: 'Wardrobe', operations });
const response = (value: unknown) => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }));
describe('OpenAI quotation provider', () => {
  it('uses strict Responses JSON, separates Hindi audio from English text and keeps keys server-side', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(output()));
    const result = await new OpenAIQuotationProvider('private-key', 'gpt-5.4-mini').propose(input);
    expect(result.reply).toContain('चौड़ाई'); expect(result.displayReply).toBe('What is its width?'); expect(result.transcript).toBe('Wardrobe');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses'); expect(options.headers.Authorization).toBe('Bearer private-key');
    const body = JSON.parse(options.body); expect(body.store).toBe(false); expect(body.text.format.strict).toBe(true); expect(body.instructions).toContain('update_section');
  });
  it('normalizes strict nullable patch fields without wiping unspecified values', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(output([{ type: 'update_project', sectionId: null, itemId: null, title: null, fields: { ...blank, clientName: 'Rahul' } }])));
    expect((await new OpenAIQuotationProvider('key','gpt-5.4-mini').propose(input)).operations).toEqual([{ type: 'update_project', fields: { clientName: 'Rahul' } }]);
  });
  it('renames existing sections in English with IDs intact', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(output([{ type: 'update_section', sectionId: 'room', itemId: null, title: 'Bedroom', fields: blank }])));
    expect((await new OpenAIQuotationProvider('key','gpt-5.4-mini').propose(input)).operations[0]).toEqual({ type: 'update_section', sectionId: 'room', title: 'Bedroom' });
  });
  it('rejects Hindi section titles instead of merely romanizing product words', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(output([{ type: 'add_section', sectionId: null, itemId: null, title: 'बेडरूम', fields: blank }])));
    await expect(new OpenAIQuotationProvider('key','gpt-5.4-mini').propose(input)).rejects.toMatchObject({ code: 'AI_LANGUAGE_INVALID' });
  });
  it('distinguishes quota errors without retrying or exposing upstream bodies', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'secret detail' } }), { status: 429 }));
    await expect(new OpenAIQuotationProvider('key','gpt-5.4-mini').propose(input)).rejects.toMatchObject({ code: 'OPENAI_QUOTA_EXHAUSTED' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('disables the Gemini factory and requires a runtime OpenAI key', () => {
    expect(() => createQuotationProvider({ provider: 'gemini', apiKey: 'key', model: 'gemini-test' })).toThrow('Gemini is disabled');
    expect(() => createQuotationProvider({ provider: 'openai', model: 'gpt-5.4-mini' })).toThrow('OPENAI_API_KEY');
  });
});

it('captures explicitly supplied specifications as structured item fields', async () => {
  const specifications = [{ label: 'Brand', value: 'Century' }];
  global.fetch = jest.fn().mockResolvedValue(response(output([{ type: 'update_item', sectionId: null, itemId: 'wardrobe', title: null, fields: { ...blank, specifications } }])));
  const result = await new OpenAIQuotationProvider('key', 'model').propose(input);
  expect(result.operations[0]).toEqual({ type: 'update_item', itemId: 'wardrobe', fields: { specifications } });
});
