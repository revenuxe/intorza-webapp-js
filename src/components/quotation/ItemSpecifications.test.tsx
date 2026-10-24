import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ItemSpecifications } from './ItemSpecifications';
import { splitItemDetails } from '@/lib/itemSpecifications';
function Editor({ initial = 'Full-height wardrobe' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <><ItemSpecifications value={value} onChange={setValue} /><output data-testid="details">{value}</output></>;
}
it('keeps specifications optional and adds only selected attributes', () => {
  render(<Editor />);
  expect(screen.queryByLabelText('Material')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  expect(screen.getByLabelText('Material')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'BWP Plywood' } });
  fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Century' } });
  expect(splitItemDetails(screen.getByTestId('details').textContent!)).toEqual({ description: 'Full-height wardrobe', specifications: [{ label: 'Material', value: 'BWP Plywood' }, { label: 'Brand', value: 'Century' }] });
  expect(screen.getByLabelText('Hardware')).toHaveValue('');
  expect(screen.getByTestId('details')).not.toHaveTextContent('Hardware:');
});
it('adds custom attributes and rejects duplicate names', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add custom field' }));
  fireEvent.change(screen.getByLabelText('Custom field name'), { target: { value: 'Warranty' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
  fireEvent.change(screen.getByLabelText('Warranty'), { target: { value: '10 years' } });
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
  expect(screen.getByLabelText('Brand')).toHaveValue('Gyproc');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Brand specification' }));
  expect(screen.getByTestId('details')).not.toHaveTextContent('Gyproc');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Material specification' }));
  expect(screen.getByTestId('details').textContent).toBe('False ceiling');
});
it('allows arbitrary values rather than requiring a catalog brand', () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole('button', { name: 'Add specifications' }));
  fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Local supplier' } });
  expect(screen.getByTestId('details')).toHaveTextContent('Brand: Local supplier');
});
