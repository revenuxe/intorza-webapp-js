import { act, render, waitFor } from '@testing-library/react';
import { QuotationJobProcessor } from './QuotationJobProcessor';
import { notifyAccountChanged } from '@/lib/accountQueries';
const mockRpc = jest.fn();
let mockOwner = 'owner';
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: mockOwner } }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
beforeEach(() => { mockOwner='owner'; mockRpc.mockReset().mockResolvedValue({data:{ready:0,failed:0},error:null}); });
afterEach(() => jest.useRealTimers());
it('delivers queued work on login, after this owner saves, and on reconnect', async () => {
  render(<QuotationJobProcessor />);
  await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));
  act(() => notifyAccountChanged('someone-else','quotations'));
  expect(mockRpc).toHaveBeenCalledTimes(1);
  act(() => notifyAccountChanged('owner','quotations'));
  expect(mockRpc).toHaveBeenCalledTimes(1);
  act(() => notifyAccountChanged('owner','quotations',true));
  await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(2));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(3));
});
it('retries background failures without affecting foreground UI and cancels retries when unmounted', async () => {
  jest.useFakeTimers();
  mockRpc.mockResolvedValueOnce({data:{ready:0,failed:1},error:null});
  const view = render(<><QuotationJobProcessor /><button>Save quotation</button></>);
  await act(async () => {});
  expect(mockRpc).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(mockRpc).toHaveBeenCalledTimes(2);
  view.unmount();
  await act(async () => { jest.advanceTimersByTime(120_000); window.dispatchEvent(new Event('online')); });
  expect(mockRpc).toHaveBeenCalledTimes(2);
});
it('continues ready batches without overlapping processors', async () => {
  mockRpc.mockResolvedValueOnce({data:{ready:2,failed:0},error:null});
  render(<QuotationJobProcessor />);
  await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(2));
  expect(mockRpc.mock.calls.every(call => call[1].p_limit===5)).toBe(true);
});
