import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuotationLibrarySuggestions } from './useQuotationLibrarySuggestions';
import { masterProducts } from '@/lib/library/model';
import { writeSnapshot } from '@/lib/library/storage';
let mockUser: { id: string } | null = null;
const mockLoad = jest.fn();
jest.mock('./useAuth', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }));
jest.mock('@/lib/library/storage', () => ({ ...jest.requireActual('@/lib/library/storage'), loadAccountLibrary: (...args: unknown[]) => mockLoad(...args) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
beforeEach(() => { localStorage.clear(); mockUser = null; mockLoad.mockReset(); mockLoad.mockResolvedValue({ entries: {}, legacy: { products: [], categories: [] } }); });
it('reads guest edits and refreshes when My Library saves on the same device', async () => {
  const view = renderHook(useQuotationLibrarySuggestions);
  await waitFor(() => expect(view.result.current.patterns).toHaveLength(800));
  const product = { ...masterProducts[0], rate: 1600 };
  act(() => writeSnapshot(null, { entries: { [product.id]: { id: product.id, kind: 'product', data: product, revision: '1' } }, pending: {} }));
  await waitFor(() => expect(view.result.current.patterns.find(row => row.id === product.id)?.preferred_rate).toBe(1600));
});
it('does not expose another account or guest overrides after identity changes', async () => {
  const product = masterProducts[0];
  writeSnapshot(null, { entries: { [product.id]: { id: product.id, kind: 'product', data: { ...product, rate: 100 }, revision: '1' } }, pending: {} });
  const view = renderHook(useQuotationLibrarySuggestions);
  await waitFor(() => expect(view.result.current.patterns.find(row => row.id === product.id)?.preferred_rate).toBe(100));
  mockUser = { id: 'account-b' }; view.rerender();
  await waitFor(() => expect(mockLoad).toHaveBeenCalledWith('account-b'));
  expect(view.result.current.patterns.find(row => row.id === product.id)?.preferred_rate).toBeNull();
});
