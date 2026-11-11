import { readSnapshot, writeSnapshot, storageKey } from './storage';
import { masterProducts } from './model';
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
beforeEach(() => localStorage.clear());
it('persists guest overrides across reads and isolates account caches', () => {
  const product = { ...masterProducts[0], rate: 1450 };
  const entry = { id: product.id, kind: 'product' as const, data: product, revision: '1' };
  writeSnapshot(null, { entries: { [product.id]: entry }, pending: {} });
  expect(readSnapshot(null).entries[product.id].data).toEqual(product);
  expect(readSnapshot('account-a').entries).toEqual({});
  writeSnapshot('account-a', { entries: { [product.id]: entry }, pending: { [product.id]: entry } });
  expect(readSnapshot('account-b').entries).toEqual({});
  expect(readSnapshot('account-a').pending[product.id]).toEqual(entry);
});
it('does not destroy unreadable saved data', () => {
  localStorage.setItem(storageKey(null), 'corrupt');
  expect(() => readSnapshot(null)).toThrow();
  expect(localStorage.getItem(storageKey(null))).toBe('corrupt');
});
