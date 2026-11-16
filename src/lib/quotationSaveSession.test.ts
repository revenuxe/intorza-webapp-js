import { QuotationSaveSession, type QuotationSaveAcknowledgement, type QuotationSavePayload } from './quotationSaveSession';

const payload = (): QuotationSavePayload => ({ quotation_title: 'Bedroom', sections: [{ id: 'local-room', section_name: 'Bedroom', items: [{ id: 'local-item', product_name: 'Wardrobe', amount: 100 }] }] });
const acknowledgement = (version = 1): QuotationSaveAcknowledgement => ({ id: 'saved-quote', version_number: version, sections: [{ id: 'saved-room', section_name: 'Bedroom', items: [{ id: 'saved-item', product_name: 'Wardrobe', amount: 100 }] }] });

it('replays an uncertain creation with the same request key without creating another version', async () => {
  const transport = jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue(acknowledgement());
  const session = new QuotationSaveSession(transport);
  const input = { id: null, version: null, payload: payload() };
  await expect(session.save(input)).rejects.toThrow('Connection lost');
  const result = await session.save(input);
  expect(transport.mock.calls[1][0]).toEqual(transport.mock.calls[0][0]);
  expect(result.mapping.items['local-item']).toBe('saved-item');
  expect(session.id).toBe('saved-quote');
  expect(session.version).toBe(1);
});

it('reconciles a lost creation before saving newer edits as an update', async () => {
  const transport = jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(acknowledgement()).mockResolvedValueOnce(acknowledgement(2));
  const session = new QuotationSaveSession(transport);
  await expect(session.save({ id: null, version: null, payload: payload() })).rejects.toThrow();
  const updated = { ...payload(), quotation_title: 'Updated bedroom' };
  const result = await session.save({ id: null, version: null, payload: updated });
  expect(transport).toHaveBeenCalledTimes(3);
  expect(transport.mock.calls[2][0]).toMatchObject({ id: 'saved-quote', expectedVersion: 1, payload: { quotation_title: 'Updated bedroom', sections: [{ id: 'saved-room', items: [{ id: 'saved-item' }] }] } });
  expect(transport.mock.calls[2][0].requestId).not.toBe(transport.mock.calls[0][0].requestId);
  expect(result.mapping.items['local-item']).toBe('saved-item');
});

it('retains a request whose acknowledgement is incomplete', async () => {
  const transport = jest.fn().mockResolvedValueOnce({ id: 'saved-quote' }).mockResolvedValueOnce(acknowledgement());
  const session = new QuotationSaveSession(transport);
  await expect(session.save({ id: null, version: null, payload: payload() })).rejects.toThrow('incomplete');
  await session.save({ id: null, version: null, payload: payload() });
  expect(transport.mock.calls[1][0].requestId).toBe(transport.mock.calls[0][0].requestId);
});

it('keeps canonical identities through consecutive uncertain saves and further edits', async () => {
  const transport = jest.fn().mockRejectedValueOnce(new Error('Lost create')).mockResolvedValueOnce(acknowledgement()).mockRejectedValueOnce(new Error('Lost update')).mockResolvedValueOnce(acknowledgement(2)).mockResolvedValueOnce(acknowledgement(3));
  const session = new QuotationSaveSession(transport);
  await expect(session.save({ id: null, version: null, payload: payload() })).rejects.toThrow();
  await expect(session.save({ id: null, version: null, payload: { ...payload(), quotation_title: 'Second edit' } })).rejects.toThrow();
  const result = await session.save({ id: null, version: null, payload: { ...payload(), quotation_title: 'Third edit' } });
  expect(transport.mock.calls[4][0]).toMatchObject({ id: 'saved-quote', expectedVersion: 2, payload: { sections: [{ id: 'saved-room', items: [{ id: 'saved-item' }] }] } });
  expect(result.mapping.items['local-item']).toBe('saved-item');
});

it('rejects a mismatched persisted result without replacing editor identities', async () => {
  const response = acknowledgement(); response.sections[0].items[0].product_name = 'Other item';
  const session = new QuotationSaveSession(jest.fn().mockResolvedValue(response));
  const data = payload();
  await expect(session.save({ id: null, version: null, payload: data })).rejects.toThrow('differ');
  expect(data.sections[0].id).toBe('local-room');
  expect(session.id).toBeNull();
});

it('drops a conclusively rejected request and keeps the known revision for stale-write protection', async () => {
  const transport = jest.fn().mockRejectedValueOnce({ details: { code: '40001' } }).mockResolvedValueOnce(acknowledgement(3));
  const session = new QuotationSaveSession(transport); session.adopt('saved-quote', 2);
  await expect(session.save({ id: 'saved-quote', version: 2, payload: payload() })).rejects.toBeTruthy();
  await session.save({ id: 'saved-quote', version: 2, payload: payload() });
  expect(transport.mock.calls[1][0].requestId).not.toBe(transport.mock.calls[0][0].requestId);
  expect(transport.mock.calls[1][0].expectedVersion).toBe(2);
});

it('does not save an existing quotation without a known database version', async () => {
  const transport = jest.fn();
  const session = new QuotationSaveSession(transport);
  await expect(session.save({ id: 'saved-quote', version: null, payload: payload() })).rejects.toThrow('Reload');
  expect(transport).not.toHaveBeenCalled();
});

it('discards an acknowledgement after the editor identity has changed', async () => {
  let finish!: (response: QuotationSaveAcknowledgement) => void;
  const session = new QuotationSaveSession(() => new Promise(resolve => { finish=resolve; }));
  const save = session.save({ id: null, version: null, payload: payload() });
  session.reset();
  finish(acknowledgement());
  await expect(save).rejects.toThrow('editor changed');
  expect(session.id).toBeNull();
});

it('prevents overlapping foreground saves', async () => {
  let finish!: (response: QuotationSaveAcknowledgement) => void;
  const transport = jest.fn(() => new Promise<QuotationSaveAcknowledgement>(resolve => { finish=resolve; }));
  const session = new QuotationSaveSession(transport);
  const input = { id: null, version: null, payload: payload() };
  const first = session.save(input);
  await expect(session.save(input)).rejects.toThrow('already in progress');
  finish(acknowledgement());
  await first;
  expect(transport).toHaveBeenCalledTimes(1);
});
