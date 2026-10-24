import { fireEvent, render, screen } from '@testing-library/react';
import { ItemMeasurements } from './ItemMeasurements';
import { changeQuotationUnit, getQuotationUnit, quotationUnits, projectAreaSqft } from '@/lib/quotationUnits';

const item = { widthFt: 6, heightFt: 8, sftArea: 48, ratePerSft: 850, amount: 40800 };

it('defaults existing items to square feet and offers every billing unit', () => {
  render(<ItemMeasurements item={item} onChange={jest.fn()} />);
  expect(screen.getByRole('combobox', { name: 'Measurement unit' })).toHaveTextContent('Sq.ft');
  expect(screen.getByRole('combobox', { name: 'Measurement unit' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByLabelText('Width (ft)')).toHaveValue('6');
  expect(screen.getByLabelText('Area (Sq.ft)')).toHaveValue('48');
});

it('uses metre dimensions for square metres', () => {
  render(<ItemMeasurements item={{ ...item, measurementUnit: 'Sq.m' }} onChange={jest.fn()} />);
  expect(screen.getByLabelText('Height (m)')).toHaveValue('8');
  expect(screen.getByLabelText('Area (Sq.m)')).toHaveValue('48');
});

it.each(quotationUnits.filter(([unit]) => unit !== 'Sq.ft' && unit !== 'Sq.m'))('uses a direct quantity for %s', unit => {
  const onChange = jest.fn();
  render(<ItemMeasurements item={{ ...item, measurementUnit: unit }} onChange={onChange} />);
  expect(screen.queryByLabelText(/Width/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(`Quantity (${unit})`), { target: { value: '3' } });
  expect(onChange).toHaveBeenCalledWith('sftArea', 3);
});

it('clears incompatible measurements and pricing when the unit changes', () => {
  expect(changeQuotationUnit(item, 'Nos')).toEqual({ measurementUnit: 'Nos', widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 });
  expect(getQuotationUnit(null)).toBe('Sq.ft');
  expect(getQuotationUnit('unsupported')).toBe('Sq.ft');
});

it('excludes non-area quantities from project area and converts square metres', () => {
 expect(projectAreaSqft({ sftArea: 48 })).toBe(48);
 expect(projectAreaSqft({ measurementUnit: 'Sq.m', sftArea: 2 })).toBeCloseTo(21.5278, 4);
 for (const [unit] of quotationUnits.filter(([unit]) => unit !== 'Sq.ft' && unit !== 'Sq.m')) expect(projectAreaSqft({ measurementUnit: unit, sftArea: 500 })).toBe(0);
});

it('marks derived area as calculated while keeping direct area entry editable', () => {
  const onChange = jest.fn();
  const view = render(<ItemMeasurements item={item} onChange={onChange} layout="product" />);
  expect(screen.getByText('Calculated')).toBeVisible();
  expect(screen.getByLabelText('Area (Sq.ft)')).not.toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Area (Sq.ft)'), { target: { value: '60' } });
  expect(onChange).toHaveBeenCalledWith('sftArea', 60);
  view.rerender(<ItemMeasurements item={{ ...item, widthFt: 0, heightFt: 0, sftArea: 60 }} onChange={onChange} layout="product" />);
  expect(screen.queryByText('Calculated')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Area (Sq.ft)')).toHaveValue('60');
});
