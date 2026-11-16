import { fireEvent, render, screen } from '@testing-library/react';
import { AdminTabsScroller } from './AdminTabsScroller';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
it('retains accessible admin tabs and scrolls the tab track in either direction', () => {
  const scrollBy = jest.fn();
  render(<Tabs defaultValue="users"><AdminTabsScroller><TabsList aria-label="Admin sections"><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="quotes">Quotes</TabsTrigger></TabsList></AdminTabsScroller></Tabs>);
  const tablist = screen.getByRole('tablist', { name: 'Admin sections' });
  Object.defineProperty(tablist.parentElement,'scrollBy',{ value: scrollBy, configurable: true });
  expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected','true');
  fireEvent.click(screen.getByRole('button', { name: 'Scroll admin sections right' }));
  expect(scrollBy).toHaveBeenLastCalledWith({ left: 180, behavior: 'smooth' });
  fireEvent.click(screen.getByRole('button', { name: 'Scroll admin sections left' }));
  expect(scrollBy).toHaveBeenLastCalledWith({ left: -180, behavior: 'smooth' });
});
