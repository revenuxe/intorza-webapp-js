import { quotationsApi } from './api';
import { masterProducts } from './library/model';
import { writeSnapshot, readSnapshot } from './library/storage';
const mockRpc = jest.fn();
const mockSelect = jest.fn();
const mockUpsert = jest.fn();
const mockQuery = { delete: jest.fn(() => mockQuery), eq: jest.fn(() => mockQuery), select: mockSelect, upsert: mockUpsert };
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: () => mockQuery, rpc: (...args: unknown[]) => mockRpc(...args) } }));
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); mockRpc.mockResolvedValue({ data: {}, error: null }); mockUpsert.mockResolvedValue({ error: null }); });
it('loads an owner-checked tier group using the selected quotation id', async () => {
  await quotationsApi.tiers('luxury');
  expect(mockRpc).toHaveBeenCalledWith('get_quotation_tiers',{ p_id: 'luxury' });
});
it('names the existing tier without creating another quotation', async () => {
  await quotationsApi.nameTier('original',' Standard ');
  expect(mockRpc).toHaveBeenCalledWith('name_quotation_tier',{ p_id: 'original', p_name: 'Standard' });
});
it('copies the selected tier through one atomic server operation', async () => {
  mockRpc.mockResolvedValue({ data: { id: 'new-tier' }, error: null });
  expect((await quotationsApi.createTier('luxury',' Custom ')).data.id).toBe('new-tier');
  expect(mockRpc).toHaveBeenCalledWith('create_quotation_tier',{ p_source_id: 'luxury', p_name: 'Custom' });
});
it('restricts tier deletion to the owner and the expected parent group', async () => {
  mockSelect.mockResolvedValue({ data: [{ id: 'luxury' }], error: null });
  await quotationsApi.removeTier('luxury','standard');
  expect(mockQuery.eq).toHaveBeenCalledWith('id','luxury');
  expect(mockQuery.eq).toHaveBeenCalledWith('tier_parent_id','standard');
  expect(mockQuery.eq).toHaveBeenCalledWith('user_id','owner');
});
it('reports a no-op deletion instead of claiming an original or inaccessible tier was removed', async () => {
  mockSelect.mockResolvedValue({ data: [], error: null });
  await expect(quotationsApi.removeTier('standard','standard')).rejects.toThrow('original quotation cannot be deleted');
});
it('flushes pending personal library prices before creating a tier', async () => {
  const product = masterProducts[0];
  const entry = { id: product.id, kind: 'product' as const, revision: 'pending', data: { ...product, rate: 300 } };
  writeSnapshot('owner',{ entries: { [entry.id]: entry }, pending: { [entry.id]: entry } });
  await quotationsApi.createTier('standard','Luxury');
  expect(mockUpsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ user_id: 'owner', data: expect.objectContaining({ rate: 300 }) })]),{ onConflict: 'user_id,entry_id' });
  expect(mockUpsert.mock.invocationCallOrder[0]).toBeLessThan(mockRpc.mock.invocationCallOrder[0]);
});
it('keeps the pending library price and aborts creation when its sync fails', async () => {
  const product = masterProducts[0];
  const entry = { id: product.id, kind: 'product' as const, revision: 'pending', data: { ...product, rate: 300 } };
  writeSnapshot('owner',{ entries: { [entry.id]: entry }, pending: { [entry.id]: entry } });
  mockUpsert.mockResolvedValue({ error: new Error('Library sync failed') });
  await expect(quotationsApi.createTier('standard','Luxury')).rejects.toThrow('Library sync failed');
  expect(mockRpc).not.toHaveBeenCalled();
  expect(readSnapshot('owner').pending[entry.id].revision).toBe('pending');
});
