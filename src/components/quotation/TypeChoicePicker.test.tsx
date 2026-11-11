import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectTypePicker } from './ProjectTypePicker';
import { RoomPicker } from './RoomPicker';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
it('accepts a custom project type from the dropdown search', async () => {
  const onChange = jest.fn(); render(<ProjectTypePicker value="" onChange={onChange} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Project Type' }));
  fireEvent.change(screen.getByPlaceholderText('Search or type a project type...'), { target: { value: 'Boutique Experience Center' } });
  fireEvent.click(screen.getByRole('button', { name: /Use.*Boutique Experience Center/ }));
  expect(onChange).toHaveBeenCalledWith('Boutique Experience Center');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
it('accepts a custom room name on Enter', () => {
  const onChange = jest.fn(); render(<RoomPicker value="" onChange={onChange} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Select room' }));
  const input = screen.getByPlaceholderText('Search or type a room name...');
  fireEvent.change(input, { target: { value: '  Music Studio  ' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('Music Studio');
});
it('opens a mobile sheet instead of an anchor-positioned popover', async () => {
  const original = window.matchMedia;
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  try {
    render(<RoomPicker value="" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Select room' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Select room' })).toBeVisible());
    expect(screen.getByText('Choose an option or type your own name.')).toBeVisible();
  } finally { window.matchMedia = original; }
});
