import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QuotationItemFields, type EditableQuotationItem } from './QuotationItemFields';
import { useQuotationLibrarySuggestions } from '@/hooks/useQuotationLibrarySuggestions';
import { readSnapshot } from '@/lib/library/storage';
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ settings: { currencySymbol: '₹', areaUnitShort: 'Sq.ft', locale: 'en-IN' }, formatCurrency: String }) }));
const initial: EditableQuotationItem = { productName: 'wa', productDetails: '', side: 'A', widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 100, amount: 0 };
const pattern = { id: 'wardrobe', product_name: 'Wardrobe', product_details: 'Plywood', preferred_rate: 1600, usage_count: 0, measurement_unit: 'Sq.ft' };
beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; });
beforeEach(() => localStorage.clear());
it('selects the saved rate without remembering the unfinished search, then saves edits immediately', () => {
  const remember = jest.fn();
  function Form() {
    const [item, setItem] = useState(initial);
    return <QuotationItemFields item={item} patterns={[pattern]} onRemember={remember} onChange={(field, value) => setItem(current => ({ ...current, [field]: value }))} />;
  }
  render(<Form />);
  const name = screen.getByLabelText('Product Name');
  act(() => name.focus());
  fireEvent.click(screen.getByRole('option', { name: /Wardrobe/ }));
  expect(screen.getByLabelText(/Rate/)).toHaveValue('1600');
  expect(remember).toHaveBeenCalledTimes(1);
  expect(remember).toHaveBeenLastCalledWith(expect.objectContaining({ productName: 'Wardrobe', ratePerSft: 1600 }), 'wardrobe');
  fireEvent.change(screen.getByLabelText(/Rate/), { target: { value: '1800' } });
  expect(remember).toHaveBeenLastCalledWith(expect.objectContaining({ productName: 'Wardrobe', ratePerSft: 1800 }), 'wardrobe');
});
it('puts a first-time product first in the second item immediately, including subsequent price changes', () => {
  function Form() {
    const library = useQuotationLibrarySuggestions();
    const [items, setItems] = useState([0, 1].map(() => ({ ...initial, productName: '', ratePerSft: 0 })));
    return <>{items.map((item, index) => <fieldset key={index} aria-label={`Item ${index + 1}`}>
      <QuotationItemFields item={item} patterns={library.patterns} onRemember={library.remember}
        onChange={(field, value) => setItems(current => current.map((row, position) => position === index ? { ...row, [field]: value } : row))} />
    </fieldset>)}</>;
  }
  render(<Form />);
  const first = within(screen.getByRole('group', { name: 'Item 1' }));
  const second = within(screen.getByRole('group', { name: 'Item 2' }));
  fireEvent.change(first.getByLabelText('Product Name'), { target: { value: 'Wardrobe' } });
  fireEvent.change(first.getByLabelText(/Rate/), { target: { value: '1500' } });
  // No quotation save, blur, or account request is needed for the new rate to be available.
  const saved = Object.values(readSnapshot(null).entries).find(entry => entry.kind === 'product')!;
  expect(saved.data).toMatchObject({ name: 'Wardrobe', rate: 1500 });
  fireEvent.change(second.getByLabelText('Product Name'), { target: { value: 'ward' } });
  let top = second.getAllByRole('option')[0];
  expect(top).toHaveTextContent('Wardrobe');
  expect(top).toHaveTextContent('1,500');
  fireEvent.click(top);
  expect(second.getByLabelText(/Rate/)).toHaveValue('1500');
  fireEvent.change(first.getByLabelText(/Rate/), { target: { value: '1850' } });
  expect(readSnapshot(null).entries[saved.id].data).toMatchObject({ rate: 1850 });
  fireEvent.change(second.getByLabelText('Product Name'), { target: { value: 'ward' } });
  top = second.getAllByRole('option')[0];
  expect(top).toHaveTextContent('1,850');
  fireEvent.click(top);
  expect(second.getByLabelText(/Rate/)).toHaveValue('1850');
  expect(Object.values(readSnapshot(null).entries).filter(entry => entry.kind === 'product')).toHaveLength(1);
});
