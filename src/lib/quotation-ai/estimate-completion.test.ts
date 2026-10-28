/** @jest-environment node */
import { applyCompletion, completionItems, OpenAIEstimateCompletion } from './estimate-completion';
import { buildEstimate } from './floor-plan';
import { toQuotation } from './domain';
import { briefFixture, draftFixture, planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
import { requirementsSchema } from './requirements';

const estimate = () => buildEstimate(proposalFixture(), planFixture(), briefFixture(), [], draftFixture());
it('keeps primary custom requirements and room-level quality in fallback pricing without incompatible reference rates', async () => {
  const previous = estimate();
  const requirements = requirementsSchema.parse({ exclusions: [], designDirection: 'Luxury walnut wardrobe with Blum hardware.', roomRequirements: [{ roomName: 'Bedroom', finishTier: 'Luxury', items: [{ workKey: 'wardrobe', details: 'Walnut veneer and Blum hardware.' }] }] });
  const brief = { ...briefFixture(), requirements };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ items: [suggestion(previous.draft.sections[0].items[0].id)] }) }] }] }) });
  const rate = { id: 'standard', name: 'Wardrobe', description: 'Standard laminate', rate: 1200, unit: 'sqft', source: 'approved' as const, currency: 'INR', location: 'Bengaluru', verifiedAt: new Date().toISOString(), sourceUrl: null, inclusions: '' };
  const result = await new OpenAIEstimateCompletion('secret', 'model').complete(previous, planFixture(), brief, [rate], 'INR', new AbortController().signal);
  const input = JSON.parse(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).input);
  expect(input.primaryRequirements.designDirection).toContain('Blum');
  expect(input.items[0].finishTier).toBe('Luxury');
  expect(input.referenceRates).toEqual([]);
  expect(result.evidence[0].price?.finishTier).toBe('Luxury');
});
const suggestion = (itemId: string) => ({ itemId, widthFt: 8, heightFt: 7, ratePerSqft: 1200, low: 1000, high: 1500,
  measurementAssumption: 'Proposed 8 ft front with 7 ft shutters; verify clearances.', pricingAssumption: 'Laminate cabinetry with standard hardware and installation; excludes GST.' });

it('finishes missing rates and dimensions with labelled allowances and exact totals', () => {
  const previous = estimate(); const snapshot = JSON.stringify(previous);
  const result = applyCompletion(previous, { items: [suggestion(previous.draft.sections[0].items[0].id)] }, briefFixture(), 'INR');
  expect(result.incomplete).toBe(false);
  expect(toQuotation(result.draft, true)[0].items[0]).toMatchObject({ widthFt: 8, heightFt: 7, sftArea: 56, ratePerSft: 1200, amount: 67200 });
  expect(result.evidence[0].price).toMatchObject({ source: 'ai_estimate', sourceUrl: null, confidence: 'low', range: { low: 1000, high: 1500 } });
  expect(toQuotation(result.draft, true)[0].items[0].productDetails).not.toMatch(/AI-estimated rate allowance|GST excluded|Review before final confirmation/i);
  expect(result.totals.total).toBe(75331.2);
  expect(JSON.stringify(previous)).toBe(snapshot);
});
it('never changes a library price while supplying estimated dimensions', () => {
  const previous = estimate(); previous.draft.sections[0].items[0].ratePerSft = 1600;
  const result = applyCompletion(previous, { items: [suggestion(previous.draft.sections[0].items[0].id)] }, briefFixture(), 'INR');
  expect(result.draft.sections[0].items[0].ratePerSft).toBe(1600);
  expect(result.evidence[0].price).toBeNull();
});
it('never changes user-entered area or invents a width for that confirmed measurement', () => {
  const previous = estimate(); previous.evidence[0].quantityStatus = 'user_entered';
  const result = applyCompletion(previous, { items: [{ ...suggestion(previous.draft.sections[0].items[0].id), widthFt: 9 }] }, briefFixture(), 'INR');
  expect(result.draft.sections[0].items[0]).toMatchObject({ sftArea: 56, widthFt: null, heightFt: null });
});
it('rejects omitted/duplicate IDs, area changes and inconsistent ranges atomically', () => {
  const previous = estimate(); const item = suggestion(previous.draft.sections[0].items[0].id);
  for (const items of [[], [item, item], [{ ...item, itemId: 'foreign' }], [{ ...item, widthFt: 20 }], [{ ...item, low: 1300 }]]) {
    expect(() => applyCompletion(previous, { items }, briefFixture(), 'INR')).toThrow();
  }
  expect(previous.draft.sections[0].items[0].ratePerSft).toBeNull();
});
it('does not force piece/package services into square-foot estimates', () => {
  const previous = estimate(); previous.draft.sections[0].items[0].productDetails = 'Billing: lump_sum; price separately.';
  expect(completionItems(previous)).toEqual([]);
});
it('uses a structured reasoning call with only project/room/pricing context', async () => {
  const previous = estimate();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ items: [suggestion(previous.draft.sections[0].items[0].id)] }) }] }] }) });
  const result = await new OpenAIEstimateCompletion('secret', 'gpt-6-astra').complete(previous, planFixture(), briefFixture(), [], 'INR', new AbortController().signal);
  expect(result.incomplete).toBe(false);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body).toMatchObject({ model: 'gpt-6-astra', store: false, reasoning: { effort: 'low' }, text: { format: { type: 'json_schema', strict: true } } });
  expect(body.input).not.toContain('clientName');
});
it('reports provider failure rather than creating a completed zero-price estimate', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'incomplete' }) });
  await expect(new OpenAIEstimateCompletion('secret', 'model').complete(estimate(), planFixture(), briefFixture(), [], 'INR', new AbortController().signal)).rejects.toThrow('interrupted');
});
it('completes every item across multiple batches without losing prior results or identities', async () => {
  const previous = estimate();
  const original = previous.draft.sections[0].items[0];
  previous.draft.sections[0].items = Array.from({ length: 25 }, (_, index) => ({ ...original, id: `item-${index}`, productName: `Storage ${index}` }));
  previous.evidence = previous.draft.sections[0].items.map(item => ({ ...previous.evidence[0], itemId: item.id }));
  global.fetch = jest.fn().mockImplementation(async (_url, options) => {
    const request = JSON.parse(options.body); const input = JSON.parse(request.input);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ items: input.items.map(item => suggestion(item.itemId)) }) }] }] }) };
  });
  const result = await new OpenAIEstimateCompletion('secret', 'model').complete(previous, planFixture(), briefFixture(), [], 'INR', new AbortController().signal);
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(result.incomplete).toBe(false);
  expect(result.draft.sections[0].items.map(item => item.id)).toEqual(previous.draft.sections[0].items.map(item => item.id));
  expect(result.draft.sections[0].items.every(item => item.ratePerSft === 1200 && item.widthFt === 8 && item.heightFt === 7)).toBe(true);
  expect(result.totals.subtotal).toBe(25 * 67200);
});
