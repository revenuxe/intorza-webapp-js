import { act, renderHook, waitFor } from '@testing-library/react';
import { useProductLibrary } from './useProductLibrary';
import { masterProducts } from '@/lib/library/model';
import { readSnapshot } from '@/lib/library/storage';
const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock('@/lib/library/storage', () => {
  const actual = jest.requireActual('@/lib/library/storage');
  return { ...actual, loadAccountLibrary: (...args: unknown[]) => mockLoad(...args), saveAccountEntries: (...args: unknown[]) => mockSave(...args) };
});
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
beforeEach(() => {
  localStorage.clear(); mockLoad.mockReset(); mockSave.mockReset();
  mockLoad.mockResolvedValue({ entries: {}, legacy: { products: [], categories: [] } });
  mockSave.mockResolvedValue(undefined);
});
it('stores guest changes locally without calling account storage', async () => {
  const view = renderHook(() => useProductLibrary(null));
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  act(() => view.result.current.commit([{ id: masterProducts[0].id, kind: 'product', data: { ...masterProducts[0], rate: 100 } }]));
  expect(readSnapshot(null).entries[masterProducts[0].id].data).toMatchObject({ rate: 100 });
  expect(mockSave).not.toHaveBeenCalled();
});
it('persists account edits before cloud saving and clears pending only after success', async () => {
  const view = renderHook(() => useProductLibrary('account-a'));
  await waitFor(() => expect(view.result.current.cloudReady).toBe(true));
  act(() => view.result.current.commit([{ id: masterProducts[0].id, kind: 'product', data: { ...masterProducts[0], rate: 1450 } }]));
  expect(readSnapshot('account-a').pending[masterProducts[0].id].data).toMatchObject({ rate: 1450 });
  await waitFor(() => expect(view.result.current.pendingCount).toBe(0), { timeout: 3000 });
  expect(mockSave).toHaveBeenCalledWith('account-a', expect.arrayContaining([expect.objectContaining({ id: masterProducts[0].id })]));
});
it('retains failed cloud saves and does not leak them into a different account', async () => {
  mockSave.mockRejectedValue(new Error('offline'));
  const first = renderHook(() => useProductLibrary('account-a'));
  await waitFor(() => expect(first.result.current.cloudReady).toBe(true));
  act(() => first.result.current.commit([{ id: masterProducts[0].id, kind: 'product', data: { ...masterProducts[0], rate: 1600 } }]));
  await waitFor(() => expect(first.result.current.error).toContain('Cloud save failed'), { timeout: 3000 });
  expect(readSnapshot('account-a').pending[masterProducts[0].id]).toBeDefined();
  first.unmount();
  const second = renderHook(() => useProductLibrary('account-b'));
  await waitFor(() => expect(second.result.current.cloudReady).toBe(true));
  expect(second.result.current.entries).toEqual({});
});
