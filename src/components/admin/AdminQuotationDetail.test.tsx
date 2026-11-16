import { fireEvent, render, screen } from '@testing-library/react';
import { AdminQuotationDetail } from './AdminQuotationDetail';
import { supabase } from '@/integrations/supabase/client';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: jest.fn() } }));
const rpc = supabase.rpc as jest.Mock;
const data = { root_id: 'root', user_email: 'owner@example.invalid', tiers: [
  { id: 'root', tier_name: 'Standard', reference_no: 'QNO-ROOT', quotation_number: 'QT-1', status: 'draft', version_count: 2, grand_total: 100, snapshot: { client_name: 'Client', quotation_title: 'Bedroom', grand_total: 100, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Standard wardrobe', product_details: 'Plywood', sft_area: 1, rate_per_sft: 100, amount: 100 }] }] } },
  { id: 'luxury', tier_name: 'Luxury', reference_no: 'QNO-CHILD', quotation_number: 'QT-2', status: 'pending', version_count: 1, grand_total: 300, snapshot: { client_name: 'Client', quotation_title: 'Bedroom', grand_total: 300, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Luxury wardrobe', product_details: 'Oak veneer', sft_area: 1, rate_per_sft: 300, amount: 300 }] }] } },
] };
beforeEach(() => { rpc.mockReset(); });
it('shows the chosen quotation and switches saved tier contents without owner-scoped reads', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<AdminQuotationDetail quotationId="root" onClose={() => {}} formatCurrency={value => `Rs ${value}`} />);
  expect(await screen.findByText('Standard wardrobe')).toBeVisible();
  expect(screen.queryByText('Luxury wardrobe')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Quotation tier' }), { target: { value: 'luxury' } });
  expect(screen.getByText('Luxury wardrobe')).toBeVisible();
  expect(screen.getByText('Oak veneer')).toBeVisible();
  expect(screen.queryByText('Standard wardrobe')).not.toBeInTheDocument();
  expect(screen.getByText('Ref QNO: QNO-ROOT')).toBeVisible();
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('admin_quotation_detail',{ p_id: 'root' });
  expect(screen.queryByRole('button', { name: /edit|delete|revert/i })).not.toBeInTheDocument();
});
it('opens a specific child option directly', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<AdminQuotationDetail quotationId="luxury" onClose={() => {}} formatCurrency={String} />);
  expect(await screen.findByText('Luxury wardrobe')).toBeVisible();
  expect(screen.getByRole('combobox', { name: 'Quotation tier' })).toHaveValue('luxury');
});
it('handles denied or failed reads without exposing stale content and allows retry', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'Admin access required' } });
  render(<AdminQuotationDetail quotationId="root" onClose={() => {}} formatCurrency={String} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to open this quotation');
  rpc.mockResolvedValue({ data, error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry quotation' }));
  expect(await screen.findByText('Standard wardrobe')).toBeVisible();
});
