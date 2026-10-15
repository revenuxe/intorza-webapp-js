import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AIPriceCatalogue } from './AIPriceCatalogue';
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { access_token: 'admin-session' } } }) },
} }));
const price = { id: 'price', product_name: 'wardrobe', material: 'laminate', specification: '18mm board',
  location: 'bengaluru', currency: 'INR', unit: 'sqft', tax: 'excluded', installation_included: true,
  source_count: 10, recent_source_count: 5, median_rate: 1200, low_rate: 800, high_rate: 1800,
  recent_rate: 1400, recent_low: 1200, recent_high: 1600, price_date: '2026-10-15' };
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ prices: [price], total: 51 }) }); });
it('shows the recent comparable median and supports catalogue pagination', async () => {
  render(<AIPriceCatalogue revision={0} />);
  expect(await screen.findByText('INR 1,400 / sqft')).toBeVisible();
  expect(screen.getByText('last 90 days · 10 total')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'), expect.objectContaining({ headers: { Authorization: 'Bearer admin-session' } })));
});
it('searches approved products and refreshes after a review changes', async () => {
  const { rerender } = render(<AIPriceCatalogue revision={0} />);
  await screen.findByText('INR 1,400 / sqft');
  fireEvent.change(screen.getByRole('textbox', { name: 'Search price catalogue' }), { target: { value: 'wardrobe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('search=wardrobe'), expect.anything()));
  rerender(<AIPriceCatalogue revision={1} />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
});
