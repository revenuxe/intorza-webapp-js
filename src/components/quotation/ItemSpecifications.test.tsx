import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ItemSpecifications } from './ItemSpecifications';
import { splitItemDetails } from '@/lib/itemSpecifications';
function Editor({ initial = 'Full-height wardrobe' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <><ItemSpecifications value={value} onChange={setValue} /><output data-testid="details">{value}</output></>;
}
beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
function choose(label: string, value: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  const search = screen.getByPlaceholderText(`Search or type ${label.toLowerCase()}...`);
  fireEvent.change(search, { target: { value } });
  const option = screen.queryByRole('option', { name: value });
  if (option) fireEvent.click(option);
  else fireEvent.keyDown(search, { key: 'Enter' });
}
it('keeps specifications optional and adds only selected attributes', () => {
  render(<Editor />);
  expect(screen.queryByLabelText('Material')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  expect(screen.getByLabelText('Material')).toHaveTextContent('Enter material');
  choose('Material', 'BWP Plywood');
  choose('Brand', 'Century');
  expect(splitItemDetails(screen.getByTestId('details').textContent!)).toEqual({ description: 'Full-height wardrobe', specifications: [{ label: 'Material', value: 'BWP Plywood' }, { label: 'Brand', value: 'Century' }] });
  expect(screen.getByLabelText('Hardware')).toHaveTextContent('Enter hardware');
  expect(screen.getByTestId('details')).not.toHaveTextContent('Hardware:');
});
it('adds custom attributes and rejects duplicate names', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add custom field' }));
  fireEvent.change(screen.getByLabelText('Custom field name'), { target: { value: 'Warranty' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  choose('Warranty', '10 years');
  expect(screen.getByTestId('details')).toHaveTextContent('Warranty: 10 years');
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add custom field' }));
  fireEvent.change(screen.getByLabelText('Custom field name'), { target: { value: 'warranty' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  expect(screen.getByRole('alert')).toHaveTextContent('already been added');
});
it('restores saved specifications and removes them without damaging the description', () => {
  render(<Editor initial={'False ceiling\n\nSpecifications:\nMaterial: Gypsum Board\nBrand: Gyproc'} />);
  fireEvent.click(screen.getByRole('button', { name: 'Specifications (2)' }));
  expect(screen.getByLabelText('Brand')).toHaveTextContent('Gyproc');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Brand specification' }));
  expect(screen.getByTestId('details')).not.toHaveTextContent('Gyproc');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Material specification' }));
  expect(screen.getByTestId('details').textContent).toBe('False ceiling');
});
it('allows arbitrary values rather than requiring a catalog brand', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  choose('Brand', 'Local supplier');
  expect(screen.getByTestId('details')).toHaveTextContent('Brand: Local supplier');
});

it('uses the room-style mobile sheet for suggestions and custom specification values', () => {
  const original = window.matchMedia;
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
  try {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Material' }));
    expect(screen.getByRole('dialog', { name: 'Material' })).toBeVisible();
    fireEvent.click(screen.getByRole('option', { name: 'BWP Plywood' }));
    expect(screen.getByRole('combobox', { name: 'Material' })).toHaveTextContent('BWP Plywood');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: 'Brand' }));
    const search = screen.getByPlaceholderText('Search or type brand...');
    expect(search).toHaveAttribute('maxlength', '160');
    fireEvent.change(search, { target: { value: 'Local supplier' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByTestId('details')).toHaveTextContent('Brand: Local supplier');
    expect(screen.getByTestId('details')).toHaveTextContent('Material: BWP Plywood');
  } finally { window.matchMedia = original; }
});

it('uses a styled searchable desktop popover without native datalists', () => {
  const { container } = render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  fireEvent.click(screen.getByRole('combobox', { name: 'Material' }));
  expect(screen.getByPlaceholderText('Search or type material...')).toBeVisible();
  expect(screen.getByRole('option', { name: 'BWP Plywood' })).toBeVisible();
  expect(container.querySelector('datalist')).toBeNull();
  expect(screen.getByRole('dialog')).toHaveAttribute('data-side', 'bottom');
});
