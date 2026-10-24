import { fireEvent, render, screen } from '@testing-library/react';
import { ItemSideSelector } from './ItemSideSelector';
it('offers compact sides and preserves custom values', () => {
  const onChange = jest.fn();
  render(<ItemSideSelector id="side" value="North" onChange={onChange} />);
  expect(screen.getByLabelText('Side')).toHaveValue('North');
  fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'B' } });
  expect(onChange).toHaveBeenCalledWith('B');
  fireEvent.change(screen.getByLabelText('Side'), { target: { value: '__custom__' } });
  fireEvent.change(screen.getByLabelText('Custom side'), { target: { value: 'East' } });
  expect(onChange).toHaveBeenCalledWith('East');
});
