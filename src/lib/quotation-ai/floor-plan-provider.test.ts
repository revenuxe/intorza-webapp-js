/** @jest-environment node */
import { OpenAIFloorPlanProvider } from './floor-plan-provider';
import { planFixture, proposalFixture } from '@/test/floor-plan-fixtures';
beforeEach(() => { global.fetch = jest.fn(); });
const complete = (value: unknown) => ({ ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) });
it('uses the configured vision model with PDF inputs and clears inferred dimensions', async () => {
  const plan = planFixture(); plan.rooms[0].source = 'inferred';
  (global.fetch as jest.Mock).mockResolvedValue(complete(plan));
  const result = await new OpenAIFloorPlanProvider('secret-key', 'configured-model').analyse([{ name: 'plan.pdf', mime: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7\n%%EOF') }], new AbortController().signal);
  expect(result.rooms[0].widthFt).toBeNull(); expect(result.rooms[0].lengthFt).toBeNull();
  const options = (global.fetch as jest.Mock).mock.calls[0][1];
  const body = JSON.parse(options.body);
  expect(body.model).toBe('configured-model'); expect(body.store).toBe(false);
  expect(body.input[0].content[1]).toMatchObject({ type: 'input_file', filename: 'plan.pdf' });
  expect(options.headers.Authorization).toBe('Bearer secret-key');
});
it('normalizes harmless room-output mistakes into a reviewable analysis', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(complete({ propertyType: '', floors: 0, units: '', scale: '', rooms: [
    { name: '', kind: 'bedroom', floor: '', widthFt: 12, lengthFt: 10, source: 'inferred', confidence: 'high', file: 'wrong.pdf', page: 0, notes: 'x'.repeat(700) },
    { name: '', kind: 'bedroom', floor: '', widthFt: 12, lengthFt: 10, source: 'inferred', confidence: 'high', file: 'wrong.pdf', page: 0, notes: '' },
  ], warnings: [] }));
  const result = await new OpenAIFloorPlanProvider('secret-key', 'configured-model').analyse([{ name: 'plan.pdf', mime: 'application/pdf', bytes: new Uint8Array() }], new AbortController().signal);
  expect(result).toMatchObject({ propertyType: 'Residential interior', floors: null, rooms: [
    { name: 'Bedroom 1', widthFt: null, lengthFt: null, file: 'plan.pdf', page: 1 },
    { name: 'Bedroom 2', widthFt: null, lengthFt: null, file: 'plan.pdf', page: 1 },
  ] });
});
it('rejects incomplete structured results instead of returning a partial proposal', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ status: 'incomplete' }) });
  await expect(new OpenAIFloorPlanProvider('secret', 'configured-model').generate({}, new AbortController().signal)).rejects.toThrow('incomplete');
});
it('validates model output before returning it', async () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].quantity = -5;
  (global.fetch as jest.Mock).mockResolvedValue(complete(proposal));
  await expect(new OpenAIFloorPlanProvider('secret', 'configured-model').generate({}, new AbortController().signal)).rejects.toThrow();
});
it('passes structured modular kitchen preferences into estimate generation', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(complete(proposalFixture()));
  const context = { brief: { kitchenPreferences: { layout: 'l_shape', carcass: 'bwr_plywood', shutter: 'laminate', hardware: 'soft_close', countertop: 'granite', appliances: 'Keep sink and hob in place.' } } };
  await new OpenAIFloorPlanProvider('secret', 'configured-model').generate(context, new AbortController().signal);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.instructions).toContain('follow brief.kitchenPreferences');
  expect(body.input[0].content[0].text).toContain('"layout":"l_shape"');
  expect(body.input[0].content[0].text).toContain('Keep sink and hob in place.');
});
it('interprets free-text exclusions with constrained room names and work keys', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(complete({ exclusions: [{ roomName: 'Bedroom', workKeys: ['ceiling','painting'] }] }));
  const result = await new OpenAIFloorPlanProvider('secret', 'configured-model').requirements({ requestNotes: 'No seling or wall painting', rooms: [{ name: 'Bedroom', work: ['ceiling','painting'] }] }, new AbortController().signal);
  expect(result.exclusions[0].workKeys).toEqual(['ceiling','painting']);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.instructions).toContain('room-specific exceptions');
  expect(body.instructions).toContain('no dark paint');
});
it('instructs quotation extraction to keep fixed packages out of sqft pricing', async () => {
  const extraction = { location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Kitchen', productName: 'Accessories', material: '', specification: '', unit: 'lump_sum', quantity: 1, rate: 20000, tax: 'unknown', installationIncluded: false, page: 1, notes: '' }] };
  (global.fetch as jest.Mock).mockResolvedValue(complete(extraction));
  await new OpenAIFloorPlanProvider('secret', 'configured-model').extractTrainingPDF(new TextEncoder().encode('%PDF-1.7\n%%EOF'), new AbortController().signal);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.instructions).toContain('Billing classification is mandatory');
  expect(body.instructions).toContain('unit=lump_sum');
});
