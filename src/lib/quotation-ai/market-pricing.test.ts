/** @jest-environment node */
import { OpenAIWebMarketPricing, resolveMarketEvidence, type ResearchInput } from './market-pricing';
const now = new Date('2026-10-15T00:00:00Z');
const input: ResearchInput = { products: [{ name: 'Wardrobe', specification: 'Laminate wardrobe installed' }], location: 'Bengaluru', currency: 'INR', finish: 'Standard' };
const sample = (url = 'https://supplier.example/wardrobe', low = 1000, high = 1400) => ({ productName: 'Wardrobe', specification: 'Laminate wardrobe installed', low, high, unit: 'sqft', currency: 'INR', location: 'Bengaluru', sourceUrl: url, sourceName: 'Supplier', publishedDate: '2026-10-01', tax: 'excluded', sellingRate: true, installationIncluded: true, comparable: true, inclusions: 'Hardware and installation included', quote: 'Installed wardrobe rate 1000–1400 per sqft excluding GST' });
const resolve = (rows: unknown[], urls = ['https://supplier.example/wardrobe']) => resolveMarketEvidence({ observations: rows, limitations: [] }, urls, input, now);
it('prices an empty catalogue with retrieved evidence and a deterministic representative rate', () => {
  const other = 'https://contractor.example/wardrobe';
  const result = resolve([sample(), sample(other, 1200, 1600)], ['https://supplier.example/wardrobe', other]);
  expect(result.rates[0]).toMatchObject({ rate: 1300, range: { low: 1000, high: 1600 }, source: 'market_estimate', currency: 'INR', confidence: 'medium' });
  expect(result.rates[0].sources).toHaveLength(2);
});
it('rejects invented URLs, incompatible locations, unknown tax, stale dates and material-only costs', () => {
  for (const row of [sample('https://invented.example'), { ...sample(), location: 'Delhi' }, { ...sample(), tax: 'unknown' }, { ...sample(), sellingRate: false }, { ...sample(), installationIncluded: false }, { ...sample(), publishedDate: '2025-01-01' }, { ...sample(), unit: 'rft' }]) expect(resolve([row]).rates).toHaveLength(0);
});
it('discloses undated sources as low-confidence indicative estimates', () => {
  const result = resolve([{ ...sample(), publishedDate: null }]);
  expect(result.rates[0].confidence).toBe('low'); expect(result.limitations.join()).toContain('publication date is unknown');
});
it('normalizes sqm rates and rejects widely conflicting comparable prices', () => {
  expect(resolve([{ ...sample(), low: 10763.9104167, high: 10763.9104167, unit: 'sqm' }]).rates[0].rate).toBe(1000);
  const other = 'https://other.example/rates';
  const result = resolve([sample(), sample(other, 5000, 6000)], ['https://supplier.example/wardrobe', other]);
  expect(result.rates).toHaveLength(0); expect(result.limitations.join()).toContain('conflict');
});
it('deduplicates equivalent domains rather than inflating source confidence', () => {
  expect(resolve([sample(), sample()]).rates[0].confidence).toBe('low');
});
it('does not fabricate a fallback if search fails or the model never searches', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
  const provider = new OpenAIWebMarketPricing('secret', 'configured-model');
  await expect(provider.research(input, new AbortController().signal)).rejects.toThrow('429');
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [] }) });
  await expect(provider.research(input, new AbortController().signal)).rejects.toThrow('No live search');
});
it('sends a bounded search request and accepts only URLs returned by that search', async () => {
  const row = { ...sample(), publishedDate: new Date().toISOString().slice(0, 10) };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [
    { type: 'web_search_call', status: 'completed', action: { type: 'search', sources: [{ url: row.sourceUrl }] } },
    { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ observations: [row], limitations: [] }) }] },
  ] }) });
  const result = await new OpenAIWebMarketPricing('secret', 'configured-model').research(input, new AbortController().signal);
  expect(result.rates[0].rate).toBe(1200);
  const options = (global.fetch as jest.Mock).mock.calls[0][1];
  const body = JSON.parse(options.body);
  expect(body).toMatchObject({ store: false, max_tool_calls: 4, tools: [{ type: 'web_search', search_context_size: 'low' }] });
  expect(body.include).toContain('web_search_call.action.sources');
  expect(body.input).not.toContain('clientName');
});
