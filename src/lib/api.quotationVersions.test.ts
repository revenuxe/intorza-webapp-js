import { quotationsApi } from './api';
const mockRpc = jest.fn();
const mockSingle = jest.fn();
const mockRange = jest.fn();
const mockBatch = jest.fn();
const query = { select: jest.fn(() => query), eq: jest.fn(() => query), in: jest.fn(() => ({order:mockBatch})), order: jest.fn(() => query), range: mockRange, maybeSingle: mockSingle };
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: () => query, rpc: (...args: unknown[]) => mockRpc(...args) } }));
beforeEach(() => jest.clearAllMocks());
it('paginates history metadata without downloading every full snapshot', async () => {
  mockRange.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: `version-${i}` })), error: null })
    .mockResolvedValueOnce({ data: [{ id: 'oldest' }], error: null });
  expect((await quotationsApi.versions('quote')).data).toHaveLength(501);
  expect(query.select).toHaveBeenCalledWith('id, quotation_id, version_number, saved_at');
  expect(query.eq).toHaveBeenCalledWith('quotation_id', 'quote');
  expect(mockRange).toHaveBeenLastCalledWith(500, 999);
});
it('scopes a selected version to the quotation and version number', async () => {
  mockSingle.mockResolvedValue({ data: { id: 'version' }, error: null });
  await quotationsApi.version('quote', 3);
  expect(query.eq).toHaveBeenCalledWith('quotation_id', 'quote');
  expect(query.eq).toHaveBeenCalledWith('version_number', 3);
});
it('uses the atomic revert RPC and propagates conflict errors', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'Quotation has changed', code: '40001' } });
  await expect(quotationsApi.revertVersion('quote', 'version', 4)).rejects.toThrow('Quotation has changed');
  expect(mockRpc).toHaveBeenCalledWith('revert_quotation_version', { p_id: 'quote', p_version_id: 'version', p_expected_version: 4 });
});
it('deduplicates and scopes a visible page of snapshots to one batch query', async () => {
  mockBatch.mockResolvedValue({data:[{version_number:2},{version_number:1}],error:null});
  expect((await quotationsApi.versionBatch('quote',[2,1,2])).data).toHaveLength(2);
  expect(query.eq).toHaveBeenCalledWith('quotation_id','quote');
  expect(query.in).toHaveBeenCalledWith('version_number',[2,1]);
  expect(mockBatch).toHaveBeenCalledTimes(1);
});
it('rejects missing snapshots and invalid batch sizes without silently dropping history', async () => {
  mockBatch.mockResolvedValue({data:[],error:null});
  await expect(quotationsApi.versionBatch('quote',[1])).rejects.toThrow('could not be found');
  await expect(quotationsApi.versionBatch('quote',Array.from({length:101},(_,i)=>i+1))).rejects.toThrow('Invalid version batch');
  expect(mockBatch).toHaveBeenCalledTimes(1);
});
