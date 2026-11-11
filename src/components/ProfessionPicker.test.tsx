import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfessionPicker } from './ProfessionPicker';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

it('filters professions and returns the selected role', async () => {
  const onChange = jest.fn();
  render(<ProfessionPicker value="other" onChange={onChange} />);
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByPlaceholderText('Search designer, carpenter, electrician...'), { target: { value: 'interior designer' } });
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
  fireEvent.click(screen.getByRole('option', { name: 'Interior Designer' }));
  expect(onChange).toHaveBeenCalledWith('interior_designer');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});

it('shows a helpful empty state for an unknown profession', async () => {
  render(<ProfessionPicker value="" onChange={jest.fn()} />);
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByPlaceholderText('Search designer, carpenter, electrician...'), { target: { value: 'zzzzzz' } });
  await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument());
  expect(screen.getByText(/No matching profession/)).toBeInTheDocument();
});
