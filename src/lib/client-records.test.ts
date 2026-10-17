import { groupClientRecords } from './client-records';
it('combines uniquely named legacy records with their saved client and links invoices by quotation', () => {
  const [client] = groupClientRecords([{ id: 'c', name: 'Client' }], [{ id: 'q', client_name: 'Client' }], [
    { id: 'i', quotation_id: 'q', client_name: 'Old spelling', total_amount: 100, paid_amount: 30, remaining_amount: 70 },
  ]);
  expect(client.id).toBe('c'); expect(client.quotations).toHaveLength(1); expect(client.invoices).toHaveLength(1);
  expect(client).toMatchObject({ totalAmount: 100, paidAmount: 30, outstanding: 70 });
});
it('never merges distinct client IDs just because they share a name', () => {
  const clients = groupClientRecords([{ id: 'a', name: 'Same' }, { id: 'b', name: 'Same' }], [
    { id: 'qa', client_id: 'a', client_name: 'Same' }, { id: 'qb', client_id: 'b', client_name: 'Same' }, { id: 'legacy', client_name: 'Same' },
  ], []);
  expect(clients.map(client => client.quotations.map(row => row.id))).toEqual([['qa'], ['qb'], ['legacy']]);
});
it('keeps a missing/foreign client ID separate and preserves invoice-only and unused clients', () => {
  const clients = groupClientRecords([{ id: 'saved', name: 'Empty' }], [{ id: 'q', client_id: 'unknown', client_name: 'Empty' }], [{ id: 'i', client_name: 'Invoice only', total_amount: 10, paid_amount: 3 }]);
  expect(clients.map(row => row.key)).toEqual(['id:saved', 'unresolved:unknown', 'name:Invoice only']);
  expect(clients[2].outstanding).toBe(7);
});
