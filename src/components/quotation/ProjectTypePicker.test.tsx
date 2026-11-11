import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectTypePicker } from './ProjectTypePicker';
beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
it('searches project types and returns the selected type', async () => {
  const change = jest.fn(); render(<ProjectTypePicker value="" onChange={change} />);
  expect(screen.getByRole('combobox')).toHaveTextContent('Choose Type');
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByPlaceholderText('Search or type a project type...'), { target: { value: 'hospital' } });
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
  fireEvent.click(screen.getByRole('option', { name: 'Hospitality' }));
  expect(change).toHaveBeenCalledWith('Hospitality');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
it('preserves existing custom project types instead of overwriting them', () => {
  const change = jest.fn(); render(<ProjectTypePicker value="Residential - 2BHK renovation" onChange={change} />);
  expect(screen.getByRole('combobox')).toHaveTextContent('Residential - 2BHK renovation');
  fireEvent.click(screen.getByRole('combobox'));
  expect(screen.getByRole('option', { name: /Residential - 2BHK renovation/ })).toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});
it('shows the canonical label for an existing lowercase type without changing its saved value', () => {
  const change = jest.fn(); render(<ProjectTypePicker value="apartment" onChange={change} />);
  expect(screen.getByRole('combobox')).toHaveTextContent('Apartment');
  expect(change).not.toHaveBeenCalled();
});
