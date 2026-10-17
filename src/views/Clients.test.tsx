import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Clients from './Clients';
import { clientsApi } from '@/lib/api';
const navigate = jest.fn();
jest.mock('@/lib/navigation', () => ({ useNavigate: () => navigate }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: (value: number) => `INR ${value}` }) }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ isPro: true, loading: false }) }));
jest.mock('@/lib/api', () => ({
  clientsApi: { list: jest.fn().mockResolvedValue({ data: [] }), deleteWithRecords: jest.fn() },
  quotationsApi: { list: jest.fn().mockResolvedValue({ data: [{ id: 'q', client_name: 'Client', quotation_number: 'QT-1', project_name: 'Kitchen' }] }) },
  invoicesApi: { list: jest.fn().mockResolvedValue({ data: [{ id: 'i', client_name: 'Client', invoice_number: 'INV-1', total_amount: 100, paid_amount: 30, remaining_amount: 70 }] }) },
}));
beforeEach(() => { jest.clearAllMocks(); });
it('opens the client record and links to quotations and invoices', async () => {
  render(<Clients />); fireEvent.click(await screen.findByRole('button', { name: 'View client Client' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Kitchen/ })); expect(navigate).toHaveBeenCalledWith('/quotations/q');
  fireEvent.click(screen.getByRole('button', { name: /INV-1/ })); expect(navigate).toHaveBeenCalledWith('/invoices/i');
});
it('requires typed confirmation and submits only the exact previewed document IDs', async () => {
  (clientsApi.deleteWithRecords as jest.Mock).mockResolvedValue({ quotations: 1, invoices: 1 });
  render(<Clients />); fireEvent.click(await screen.findByRole('button', { name: 'View client Client' }));
  fireEvent.click(screen.getByRole('button', { name: /^Delete client$/ }));
  const confirm = screen.getByRole('button', { name: 'Delete client & records' }); expect(confirm).toBeDisabled();
  expect(clientsApi.deleteWithRecords).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } }); fireEvent.click(confirm);
  await waitFor(() => expect(clientsApi.deleteWithRecords).toHaveBeenCalledWith(null, 'Client', ['q'], ['i']));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('keeps the review open on failure and shows the database rejection', async () => {
  (clientsApi.deleteWithRecords as jest.Mock).mockRejectedValue(new Error('Client records changed. Reopen the client.'));
  render(<Clients />); fireEvent.click(await screen.findByRole('button', { name: 'View client Client' }));
  fireEvent.click(screen.getByRole('button', { name: /^Delete client$/ }));
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Delete client & records' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Client records changed'); expect(screen.getByRole('dialog')).toBeVisible();
});
