import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';
const rpc = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));
beforeEach(() => rpc.mockReset());
it('loads older history on demand instead of stopping at ten receipts', async () => {
  rpc.mockResolvedValue({ data: { total: 21, payments: [] }, error: null });
  render(<PaymentHistoryDialog account={{ id: 'owner', login_email: 'owner@example.test' }} onClose={() => {}} />);
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('21 records');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('admin_payment_history', { p_user: 'owner', p_page: 1 }));
});
it('allows retry after a failed history request', async () => {
  rpc.mockResolvedValueOnce({ error: { message: 'unavailable' } }).mockResolvedValue({ data: { total: 0, payments: [] }, error: null });
  render(<PaymentHistoryDialog account={{ id: 'owner', login_email: 'owner@example.test' }} onClose={() => {}} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No payments recorded for this account.')).toBeVisible();
});
