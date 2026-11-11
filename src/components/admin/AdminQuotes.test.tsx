import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminQuotes } from './AdminQuotes';
import { supabase } from '@/integrations/supabase/client';

jest.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('./QuotationAIBadge', () => ({ QuotationAIBadge: () => null }));
const rpc = supabase.rpc as jest.Mock;
const quote = { id: 'one', quotation_number: 'QT-123', reference_no: 'QNO-ABC123', client_name: 'Client One', project_name: 'Kitchen', grand_total: 100, status: 'pending', user_email: 'owner@example.invalid', created_at: '2026-11-12' };
beforeEach(() => rpc.mockReset());

it('shows references, paginates and searches from the first page', async () => {
  rpc.mockImplementation(async (name, args) => ({ data: name === 'admin_quotation_ai_selections' ? [] : { rows: [quote], total: args.p_search ? 1 : 101, page: args.p_page, page_size: 50 }, error: null }));
  render(<AdminQuotes formatCurrency={String} />);
  expect(await screen.findByText('QNO-ABC123')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('admin_quotation_directory', { p_search: '', p_page: 1 }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' QNO-ABC123 ' } });
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('admin_quotation_directory', { p_search: 'QNO-ABC123', p_page: 0 }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 quotation found'));
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});

it('recovers from a failed request and supports empty searches', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
  render(<AdminQuotes formatCurrency={String} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load quotations');
  rpc.mockResolvedValue({ data: { rows: [], total: 0, page: 0, page_size: 50 }, error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No quotations found.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
  expect(await screen.findByText('No quotations match your search.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear quotation search' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
});
