import { quotationsApi } from './api';
const mockRpc = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, rpc: (...args: unknown[]) => mockRpc(...args) } }));
beforeEach(() => { jest.clearAllMocks(); mockRpc.mockResolvedValue({ data: {}, error: null }); });
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
