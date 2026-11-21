import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FloorHomeSizePicker } from './FloorHomeSizePicker';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
function Picker() {
  const [values, setValues] = useState<Record<string, string>>({});
  return <FloorHomeSizePicker floors={['Ground Floor', 'First Floor']} values={values} previousSize="" onChange={setValues} />;
}
it('lets users select different BHKs in one panel and clear one floor independently', () => {
  render(<Picker />);
  fireEvent.click(screen.getByRole('button', { name: 'BHK / Home Size' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Ground Floor home size' })).getByRole('button', { name: '1 BHK' }));
  expect(screen.queryByRole('group', { name: 'First Floor home size' })).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'First Floor' }), { button: 0, ctrlKey: false });
  fireEvent.click(within(screen.getByRole('group', { name: 'First Floor home size' })).getByRole('button', { name: '2 BHK' }));
  expect(screen.getByRole('button', { name: 'BHK / Home Size' })).toHaveTextContent('G: 1 BHK · 1: 2 BHK');
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Ground Floor' }), { button: 0, ctrlKey: false });
  expect(within(screen.getByRole('group', { name: 'Ground Floor home size' })).getByRole('button', { name: '1 BHK' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Clear Ground Floor' }));
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'First Floor' }), { button: 0, ctrlKey: false });
  expect(within(screen.getByRole('group', { name: 'First Floor home size' })).getByRole('button', { name: '2 BHK' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Done/ }));
  expect(screen.queryByRole('dialog', { name: 'BHK by floor' })).not.toBeInTheDocument();
});
