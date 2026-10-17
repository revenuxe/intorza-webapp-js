import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvoiceDetail from './InvoiceDetail';
import { generateInvoicePDF } from '@/lib/invoicePdfGenerator';
jest.mock('@/lib/navigation', () => ({ useParams: () => ({ id: 'invoice' }), useNavigate: () => jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: (value: number) => `INR ${value}`, formatDateShort: (value: string) => value }) }));
jest.mock('@/lib/invoicePdfGenerator', () => ({ generateInvoicePDF: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/components/InvoicePreviewEditor', () => ({ InvoicePreviewEditor: () => null }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: jest.fn() } } }));
jest.mock('@/lib/api', () => ({ profileApi: { get: async () => ({ data: null }) }, invoicesApi: { get: async () => ({ data: {
  id: 'invoice', invoice_number: 'INV-1', total_amount: 100000, paid_amount: 80000, remaining_amount: 20000,
  client_name: 'Client', project_name: 'Interior', invoice_date: '2026-10-01', due_date: '2099-01-01', status: 'partially_paid', quotation_id: null,
  payments: [{ id: 'first', amount: 55000, payment_date: '2026-10-01', created_at: '2026-10-01T10:00:00Z', payment_method: 'cash', notes: '' },
    { id: 'second', amount: 25000, payment_date: '2026-10-17', created_at: '2026-10-17T10:00:00Z', payment_method: 'upi', notes: '' }],
} }) } }));
it('passes invoice-level balances into the PDF for both recent and older individual receipts', async () => {
  render(<InvoiceDetail />);
  fireEvent.click(await screen.findByRole('button', { name: 'Download receipt for payment 1' }));
  await waitFor(() => expect(generateInvoicePDF).toHaveBeenCalledWith(expect.objectContaining({
    totalAmount: 100000, paidAmount: 80000, remainingAmount: 20000, status: 'partially_paid',
    payments: [expect.objectContaining({ amount: 25000 })],
  })));
  fireEvent.click(screen.getByRole('button', { name: 'Download receipt for payment 2' }));
  await waitFor(() => expect(generateInvoicePDF).toHaveBeenLastCalledWith(expect.objectContaining({
    totalAmount: 100000, paidAmount: 55000, remainingAmount: 45000, status: 'partially_paid',
    payments: [expect.objectContaining({ amount: 55000 })],
  })));
});
