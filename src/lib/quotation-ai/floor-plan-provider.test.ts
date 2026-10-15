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
it('rejects incomplete structured results instead of returning a partial proposal', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ status: 'incomplete' }) });
  await expect(new OpenAIFloorPlanProvider('secret', 'configured-model').generate({}, new AbortController().signal)).rejects.toThrow('incomplete');
});
it('validates model output before returning it', async () => {
  const proposal = proposalFixture(); proposal.sections[0].items[0].quantity = -5;
  (global.fetch as jest.Mock).mockResolvedValue(complete(proposal));
  await expect(new OpenAIFloorPlanProvider('secret', 'configured-model').generate({}, new AbortController().signal)).rejects.toThrow();
});
