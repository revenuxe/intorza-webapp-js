import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectTypeFields } from './ProjectTypeFields';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
it('allows a BHK selection without selecting floors', () => {
  const onChange = jest.fn();
  render(<ProjectTypeFields value="Residential" onChange={onChange} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'BHK / Home Size' }));
  fireEvent.click(screen.getByRole('option', { name: '2 BHK' }));
  expect(onChange).toHaveBeenCalledWith('Residential - 2 BHK');
});
it('switches to individual floor choices without assigning a previous BHK to every floor', () => {
  render(<ProjectTypeFields value="Residential - 2 BHK | Floors: G+1" onChange={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'BHK / Home Size' }));
  expect(screen.getByRole('tab', { name: 'Ground Floor' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'First Floor' })).toBeInTheDocument();
  expect(screen.getByText(/Previous home size: 2 BHK/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2 BHK' })).toHaveAttribute('aria-pressed', 'false');
});
