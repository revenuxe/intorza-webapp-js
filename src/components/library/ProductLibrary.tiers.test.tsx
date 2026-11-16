import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductLibraryWorkspace } from './ProductLibrary';
import { masterProducts, type Product } from '@/lib/library/model';
import { readSnapshot, writeSnapshot } from '@/lib/library/storage';
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
beforeEach(() => { localStorage.clear(); window.history.replaceState(null,'','/library'); });
it('edits a Luxury library rate without changing Standard or Basic', async () => {
  const product = { ...masterProducts[0], rate: 100 };
  writeSnapshot(null,{ entries: { [product.id]: { id: product.id, kind: 'product', data: product, revision: '1' } }, pending: {} });
  render(<ProductLibraryWorkspace owner={null} />);
  const rate = await screen.findByRole('textbox', { name: `Rate for ${product.name}` });
  expect(rate).toHaveValue('100');
  fireEvent.change(screen.getByRole('combobox', { name: 'Pricing tier' }), { target: { value: 'luxury' } });
  expect(rate).toHaveValue('');
  fireEvent.change(rate,{ target: { value: '300' } }); fireEvent.blur(rate);
  await waitFor(() => expect((readSnapshot(null).entries[product.id].data as Product).tierPrices?.luxury?.rate).toBe(300));
  expect((readSnapshot(null).entries[product.id].data as Product).rate).toBe(100);
  fireEvent.change(screen.getByRole('combobox', { name: 'Pricing tier' }), { target: { value: 'standard' } });
  expect(rate).toHaveValue('100');
  fireEvent.change(screen.getByRole('combobox', { name: 'Pricing tier' }), { target: { value: 'basic' } });
  expect(rate).toHaveValue('');
});
it('opens the library in the pricing mode linked from a quotation tier', async () => {
  window.history.replaceState(null,'','/library?pricingTier=luxury');
  render(<ProductLibraryWorkspace owner={null} />);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Pricing tier' })).toHaveValue('luxury'));
});
