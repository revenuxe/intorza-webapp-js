import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApprovedRatesPanel } from './ApprovedRatesPanel';
import { supabase } from '@/integrations/supabase/client';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: jest.fn() }, from: jest.fn() } }));
const insert = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'owner' } } });
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [], error: null }), insert };
  (supabase.from as jest.Mock).mockReturnValue(query); insert.mockResolvedValue({ error: null });
});
it('does not promote historical prices without an explicit approval', async () => {
  render(<ApprovedRatesPanel currency="INR" />);
  await screen.findByText(/No approved rates yet/);
  expect(insert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Approve a rate' }));
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Wardrobe' } });
  fireEvent.change(screen.getByLabelText('Exact materials and specifications'), { target: { value: 'Customer-approved laminate' } });
  fireEvent.change(screen.getByLabelText(/Rate \(INR/), { target: { value: '1200' } });
  fireEvent.change(screen.getByLabelText(/Labour, hardware/), { target: { value: 'Installation included, transport excluded' } });
  expect(insert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm approved rate' }));
  await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', product_name: 'Wardrobe', rate: 1200, unit: 'sqft', currency: 'INR', inclusions: 'GST excluded. Installation included, transport excluded' })));
});
