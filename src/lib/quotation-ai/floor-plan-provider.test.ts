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
  expect(body.instructions).toContain('follow the primary notes and brief.requirements');
  expect(body.instructions).toContain('use brief.kitchenPreferences only where the primary brief is silent');
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
it('repairs the observed empty global exclusion label and constrains future provider output', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(complete({ exclusions: [{ roomName: '', workKeys: ['painting','ceiling'] }] }))
    .mockResolvedValueOnce(complete({ exclusions: [{ roomName: 'All rooms', workKeys: ['painting','ceiling'] }] }));
  const result = await new OpenAIFloorPlanProvider('secret','configured-model').requirements({ requestNotes: 'no wall painting, and no wallseiling and no unncerrasry thing in quoatation' }, new AbortController().signal);
  expect(result.exclusions).toEqual([{ roomName: 'All rooms', workKeys: ['painting','ceiling'] }]);
  const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.text.format.schema.properties.exclusions.items.properties.roomName).toMatchObject({ minLength: 1, maxLength: 150 });
  expect(body.instructions).toContain('set roomName to "All rooms"');
});
it('accepts a requirements response with empty item placeholders while preserving the supplied exclusions', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(complete({ exclusions:[{roomName:'Bedroom',workKeys:['painting','ceiling']}],roomRequirements:[{roomName:'Bedroom',includedWorkKeys:['wardrobe'],items:[{workKey:'wardrobe',details:'',finishTier:null}]}],reviewNotes:[''] }));
  const result=await new OpenAIFloorPlanProvider('secret','configured-model').requirements({requestNotes:'No wall painting, and no wallseiling and no unncerrasry thing in quoatation.',rooms:[{name:'Bedroom'}]},new AbortController().signal);
  expect(result.exclusions[0].workKeys).toEqual(['painting','ceiling']);
  expect(result.roomRequirements[0].includedWorkKeys).toEqual(['wardrobe']);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('repairs invalid requirements once using the original note and preserves custom specifications', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(complete({exclusions:[],designDirection:'Long description. '.repeat(100)}))
    .mockResolvedValueOnce(complete({exclusions:[{roomName:'Bedroom',workKeys:['painting','ceiling']}],roomRequirements:[{roomName:'Bedroom',items:[{workKey:'wardrobe',details:'Marine plywood with Blum hardware.'}]}]}));
  const note='Marine plywood and Blum hardware. No painting or wallseiling.';
  const result=await new OpenAIFloorPlanProvider('secret','configured-model').requirements({requestNotes:note,rooms:[{name:'Bedroom'}]},new AbortController().signal);
  expect(fetch).toHaveBeenCalledTimes(2);
  const retry=JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
  const input=JSON.parse(retry.input[0].content[0].text);
  expect(input.originalContext.requestNotes).toBe(note);
  expect(input.validationCorrection.issues).toEqual(expect.arrayContaining([expect.objectContaining({path:'designDirection',code:'too_big'})]));
  expect(result.roomRequirements[0].items[0].details).toContain('Blum hardware');
  expect(result.exclusions[0].workKeys).toEqual(['painting','ceiling']);
});
it('re-interprets ambiguous blank optional work instead of guessing unnecessary additions', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(complete({exclusions:[],roomRequirements:[{roomName:'Bedroom',items:[{workKey:'electrical',details:'',finishTier:null}]}]}))
    .mockResolvedValueOnce(complete({exclusions:[{roomName:'Bedroom',workKeys:['painting','ceiling']}],roomRequirements:[]}));
  const result=await new OpenAIFloorPlanProvider('secret','configured-model').requirements({requestNotes:'No wall painting and no wallseiling and no unnecessary things.'},new AbortController().signal);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(result.roomRequirements).toEqual([]);
  expect(result.exclusions[0].workKeys).toEqual(['painting','ceiling']);
});
it('stops after one unsuccessful repair instead of generating a default quote from malformed requirements', async () => {
  (fetch as jest.Mock).mockResolvedValue(complete({exclusions:[],finishTier:'unsupported-tier'}));
  await expect(new OpenAIFloorPlanProvider('secret','configured-model').requirements({requestNotes:'Specific customer requirements.'},new AbortController().signal)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('instructs quotation extraction to keep fixed packages out of sqft pricing', async () => {
  const extraction = { location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Kitchen', productName: 'Accessories', material: '', specification: '', unit: 'lump_sum', quantity: 1, rate: 20000, tax: 'unknown', installationIncluded: false, page: 1, notes: '' }] };
  (global.fetch as jest.Mock).mockResolvedValue(complete(extraction));
  await new OpenAIFloorPlanProvider('secret', 'configured-model').extractTrainingPDF(new TextEncoder().encode('%PDF-1.7\n%%EOF'), new AbortController().signal);
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.instructions).toContain('Billing classification is mandatory');
  expect(body.instructions).toContain('unit=lump_sum');
});
