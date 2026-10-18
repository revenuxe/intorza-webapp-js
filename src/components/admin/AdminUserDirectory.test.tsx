import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminUserDirectory } from './AdminUserDirectory';
const rpc = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args), auth: { getUser: async () => ({ data: { user: { id: 'admin-id' } }, error: null }) } } }));
const account = { id: 'account-id', login_email: 'login@example.test', quotation_email: 'pdf@example.test', full_name: 'Owner', company_name: 'Company', phone: '123', created_at: null, last_sign_in_at: null, pro_active: false, pro_expiry: '2026-01-01T00:00:00Z', pro_plan: 'monthly', payment_status: 'active', quotation_count: 3, invoice_count: 2, payments: [{ id: 'receipt', created_at: '2026-01-01T00:00:00Z', amount: 49900, currency: 'INR', status: 'captured', event_type: 'pro_activation', provider_event_id: 'activation:pay_example' }] };
beforeEach(() => { rpc.mockReset(); rpc.mockImplementation(async (name: string) => ({ data: name === 'admin_payment_history' ? { payments: account.payments, total: 1 } : { users: [account], total: 1 }, error: null })); });
it('separates login identity from quotation contact and shows expired access', async () => {
  render(<AdminUserDirectory />);
  expect(await screen.findByText('login@example.test')).toBeVisible();
  expect(screen.getByText('pdf@example.test')).toBeVisible();
  expect(screen.getByText('account-id')).toBeVisible();
  expect(screen.getByText('Free / expired', { selector: 'div' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Search user accounts'), { target: { value: 'pdf@example.test' } });
  await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('admin_user_directory', { p_search: 'pdf@example.test', p_status: 'all', p_page: 0, p_sort: 'newest' }));
});
it('shows the amount and provider reference for billing investigation', async () => {
  render(<AdminUserDirectory billing />);
  fireEvent.click(await screen.findByRole('button', { name: 'View payment history' }));
  expect(await screen.findByRole('dialog')).toBeVisible();
  expect(await screen.findByText(/499.00/)).toBeVisible();
  expect(screen.getByText('activation:pay_example')).toBeVisible();
});
it('reports failed requests instead of displaying an empty user list', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
  render(<AdminUserDirectory />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load account details');
});
it('can revoke access using zero days and the authenticated admin identity', async () => {
  rpc.mockImplementation(async (name: string) => name === 'admin_user_directory' ? { data: { users: [{ ...account, pro_active: true }], total: 1 }, error: null } : { data: null, error: null });
  render(<AdminUserDirectory billing />);
  fireEvent.click(await screen.findByText('Manage Pro access'));
  fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('admin_set_pro_access', expect.objectContaining({ p_admin: 'admin-id', p_user: 'account-id', p_days: 0 })));
});

it('keeps Pro management out of the Users section', async () => {
  render(<AdminUserDirectory />);
  await screen.findByText('login@example.test');
  expect(screen.queryByText('Manage Pro access')).not.toBeInTheDocument();
});
it('requests recent purchases first in Billing and lets admins change sorting', async () => {
  render(<AdminUserDirectory billing />);
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('admin_user_directory', expect.objectContaining({ p_sort: 'purchase' })));
  fireEvent.change(screen.getByLabelText('Sort billing accounts'), { target: { value: 'newest' } });
  await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('admin_user_directory', expect.objectContaining({ p_sort: 'newest', p_page: 0 })));
});
