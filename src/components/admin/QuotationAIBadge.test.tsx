import { fireEvent, render, screen } from '@testing-library/react';
import { QuotationAIBadge } from './QuotationAIBadge';

it('opens a compact popup with the saved scope and selections', () => {
  render(<QuotationAIBadge quotationNumber="QT-1" selections={{ property_type: '2 BHK', brief: {
    scope: 'complete', roomNames: ['Kitchen', 'Bedroom'], finish: 'Premium', measurementInputUnit: 'sqft',
    kitchenPreferences: { hardware: 'soft_close' }, design: { coordinatedLook: true, retainExisting: false, notes: 'Warm finishes' },
  } }} />);
  expect(screen.queryByText('Full interior')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'AI selections for QT-1' }));
  expect(screen.getByText('Full interior')).toBeInTheDocument();
  expect(screen.getByText('Kitchen, Bedroom')).toBeInTheDocument();
  expect(screen.getByText('Premium')).toBeInTheDocument();
  expect(screen.getByText('Soft Close')).toBeInTheDocument();
  expect(screen.getByText('Warm finishes')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByText('Full interior')).not.toBeInTheDocument();
});

it('handles older AI records without saved selections', () => {
  render(<QuotationAIBadge quotationNumber="QT-2" selections={{ property_type: null, brief: null }} />);
  fireEvent.click(screen.getByRole('button', { name: 'AI selections for QT-2' }));
  expect(screen.getByText('Not recorded')).toBeInTheDocument();
});

it('shows kitchen-only scope and tolerates malformed optional fields', () => {
  render(<QuotationAIBadge quotationNumber="QT-3" selections={{ property_type: null, brief: {
    scope: 'kitchen', roomNames: ['Kitchen', null], roomWork: [null, { roomName: 'Kitchen', items: [{ key: 'base_cabinets' }] }],
  } }} />);
  fireEvent.click(screen.getByRole('button', { name: 'AI selections for QT-3' }));
  expect(screen.getByText('Scope').nextSibling).toHaveTextContent('Kitchen');
  expect(screen.getByText('Base Cabinets')).toBeInTheDocument();
});
