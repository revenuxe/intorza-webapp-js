import { fireEvent, render, screen } from '@testing-library/react';
import { QuotationItemCard } from './QuotationItemCard';
const item = { id: 'wardrobe', productName: 'Wardrobe', measurementUnit: 'Sq.ft', sftArea: 56, ratePerSft: 1850, amount: 103600 };
const props = { item, index: 0, pending: false, activeItemId: null, onActivate: jest.fn(), currencySymbol: 'Rs. ', locale: 'en-IN', actions: null };
it('starts saved completed items collapsed with their pricing summary', () => {
  render(<QuotationItemCard {...props}><input aria-label="Description" defaultValue="Loft" /></QuotationItemCard>);
  expect(screen.getByRole('button', { name: '1. Wardrobe' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('56 Sq.ft x Rs. 1,850.00')).toBeVisible();
  expect(screen.getByText('Rs. 1,03,600.00')).toBeVisible();
  expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1. Wardrobe' }));
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Loft');
});
it('keeps the current item open as its rate becomes complete, then closes when another item is activated', () => {
  const view = render(<QuotationItemCard {...props} item={{ ...item, ratePerSft: 0 }} activeItemId="wardrobe"><input aria-label="Description" defaultValue="Loft" /></QuotationItemCard>);
  view.rerender(<QuotationItemCard {...props} activeItemId="wardrobe"><input aria-label="Description" defaultValue="Loft" /></QuotationItemCard>);
  expect(screen.getByRole('textbox', { name: 'Description' })).toBeVisible();
  view.rerender(<QuotationItemCard {...props} activeItemId="item-2"><input aria-label="Description" defaultValue="Loft" /></QuotationItemCard>);
  expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1. Wardrobe' }));
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Loft');
});
it('keeps incomplete items open when another item is activated', () => {
  render(<QuotationItemCard {...props} activeItemId="item-2" item={{ ...item, sftArea: 0 }}><input aria-label="Description" /></QuotationItemCard>);
  expect(screen.getByRole('textbox', { name: 'Description' })).toBeVisible();
});

it('collapses unfinished items when a room or item is added and preserves their inputs', () => {
  const incomplete = { ...item, ratePerSft: 0 };
  const view = render(<QuotationItemCard {...props} item={incomplete}><input aria-label="Description" defaultValue="Unsaved notes" /></QuotationItemCard>);
  expect(screen.getByRole('textbox', { name: 'Description' })).toBeVisible();
  view.rerender(<QuotationItemCard {...props} item={incomplete} collapseExceptItemId="new-item"><input aria-label="Description" defaultValue="Unsaved notes" /></QuotationItemCard>);
  expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1. Wardrobe' }));
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Unsaved notes');
});
it('leaves the newly added item open', () => {
  render(<QuotationItemCard {...props} item={{ ...item, ratePerSft: 0 }} collapseExceptItemId={item.id}><input aria-label="Description" /></QuotationItemCard>);
  expect(screen.getByRole('textbox', { name: 'Description' })).toBeVisible();
});
