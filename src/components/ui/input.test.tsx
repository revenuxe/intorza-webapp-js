import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Input } from './input';
function NumberField({ hideZero = false }: { hideZero?: boolean }) {
  const [value, setValue] = useState(0);
  return <><Input aria-label="Amount" type="number" placeholder="0" value={hideZero ? value || '' : value} min="0" max="100" step="0.1" onChange={event => setValue(parseFloat(event.target.value) || 0)} /><output aria-label="Calculation">{value * 2}</output></>;
}
it('stays fully empty after deleting zero, including after blur', () => {
  render(<NumberField />); const input = screen.getByLabelText('Amount');
  fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input);
  expect(input).toHaveValue(''); expect(input).toHaveAttribute('placeholder', ''); expect(screen.getByLabelText('Calculation')).toHaveTextContent('0');
});
it('preserves partially typed decimals without step rounding', () => {
  render(<NumberField />); const input = screen.getByLabelText('Amount');
  for (const value of ['1', '1.', '1.25', '', '.', '.5']) { fireEvent.change(input, { target: { value } }); expect(input).toHaveValue(value); }
  expect(screen.getByLabelText('Calculation')).toHaveTextContent('1');
});
it('preserves an explicitly typed zero even when the parent hides zero', () => {
  render(<NumberField hideZero />); const input = screen.getByLabelText('Amount');
  fireEvent.change(input, { target: { value: '0' } }); expect(input).toHaveValue('0');
  fireEvent.change(input, { target: { value: '' } }); expect(input).toHaveValue('');
});
it('reflects external loaded or AI values and keeps range validation', () => {
  const view = render(<Input aria-label="Rate" type="number" value={0} onChange={() => {}} min="0" max="100" />);
  fireEvent.change(screen.getByLabelText('Rate'), { target: { value: '' } });
  view.rerender(<Input aria-label="Rate" type="number" value={18} onChange={() => {}} min="0" max="100" />);
  expect(screen.getByLabelText('Rate')).toHaveValue('18');
  view.unmount(); render(<NumberField />); const input = screen.getByLabelText('Amount') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '101' } }); expect(input.checkValidity()).toBe(false);
  fireEvent.change(input, { target: { value: '10' } }); expect(input.checkValidity()).toBe(true);
  fireEvent.change(input, { target: { value: 'oops' } }); expect(input).toHaveValue('10');
});
