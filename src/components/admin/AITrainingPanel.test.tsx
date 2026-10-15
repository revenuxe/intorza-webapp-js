import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AITrainingPanel } from './AITrainingPanel';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: 'admin-session' } } })) } } }));
const document = { id: '00000000-0000-4000-8000-000000000001', filename: 'reference.pdf', status: 'pending', created_at: '2026-10-15', extraction: { location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Bedroom', productName: 'Wardrobe', material: 'Laminate', specification: '18 mm board', unit: 'sqft', rate: 1200, quantity: 56, tax: 'excluded', installationIncluded: true, page: 1, notes: '' }] } };
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [document] }) }); });
it('requires review confirmation before publishing extracted patterns', async () => {
  render(<AITrainingPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /reference.pdf/ }));
  const approve = screen.getByRole('button', { name: 'Approve & publish' });
  expect(approve).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the entries/ }));
  expect(approve).toBeEnabled();
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
  fireEvent.click(approve);
  await waitFor(() => expect(screen.getByText(/Published. New quotation requests/)).toBeVisible());
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
  expect(body).toMatchObject({ action: 'approve', confirmAnonymized: true });
});
it('keeps corrections and clears approval confirmation when a reference changes', async () => {
  render(<AITrainingPanel />);
  fireEvent.click(await screen.findByRole('button', { name: /reference.pdf/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the entries/ }));
  fireEvent.change(screen.getByLabelText('Unit rate'), { target: { value: '1350' } });
  expect(screen.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
  expect(screen.getByLabelText('Unit rate')).toHaveValue('1350');
});
