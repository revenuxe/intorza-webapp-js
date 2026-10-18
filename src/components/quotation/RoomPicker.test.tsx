import { fireEvent, render, screen } from '@testing-library/react';
import { RoomItemSuggestions } from './RoomPicker';

it('shows room-specific items and adds only the clicked suggestion', () => {
  const onAdd = jest.fn();
  const { rerender } = render(<RoomItemSuggestions room="Kitchen" selectedItems={[]} onAdd={onAdd} />);
  expect(screen.queryByRole('button', { name: 'Wardrobe' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Base Unit' }));
  expect(onAdd).toHaveBeenCalledWith('Base Unit');
  expect(onAdd).toHaveBeenCalledTimes(1);
  rerender(<RoomItemSuggestions room="Kitchen" selectedItems={['base unit']} onAdd={onAdd} />);
  expect(screen.getByRole('button', { name: 'Base Unit' })).toBeDisabled();
  rerender(<RoomItemSuggestions room="Master Bedroom" selectedItems={['Base Unit']} onAdd={onAdd} />);
  expect(screen.getByRole('button', { name: 'Wardrobe' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Base Unit' })).toBeNull();
});

it('supports typed room names and leaves custom rooms without suggestions', () => {
  const { rerender } = render(<RoomItemSuggestions room="  kitchen " selectedItems={[]} onAdd={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Base Unit' })).toBeVisible();
  rerender(<RoomItemSuggestions room="Custom space" selectedItems={[]} onAdd={jest.fn()} />);
  expect(screen.queryByText('Suggested items')).toBeNull();
});
