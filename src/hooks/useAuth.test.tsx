import { act, render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './useAuth';

let mockListener: (event: string, session: Session | null) => void;
let mockResolve: (value: { data: { session: Session | null } }) => void;
const mockUnsubscribe = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: {
    onAuthStateChange: jest.fn((listener) => {
      mockListener = listener;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }),
    getSession: jest.fn(() => new Promise((resolve) => { mockResolve = resolve; })),
    signOut: jest.fn(),
  } },
}));

const session = (id: string) => ({ user: { id } }) as Session;
function State() {
  const { user, loading } = useAuth();
  return <div>{loading ? 'loading' : user?.id ?? 'signed out'}</div>;
}

it('restores the persisted session', async () => {
  render(<AuthProvider><State /></AuthProvider>);
  await act(async () => { mockResolve({ data: { session: session('owner') } }); });
  expect(screen.getByText('owner')).toBeInTheDocument();
});

it.each(['SIGNED_IN', 'SIGNED_OUT'])('keeps a newer %s event when startup resolves late', async (event) => {
  render(<AuthProvider><State /></AuthProvider>);
  act(() => { mockListener(event, event === 'SIGNED_IN' ? session('new-owner') : null); });
  await act(async () => { mockResolve({ data: { session: session('old-owner') } }); });
  expect(screen.getByText(event === 'SIGNED_IN' ? 'new-owner' : 'signed out')).toBeInTheDocument();
});

it('unsubscribes on unmount and ignores a pending startup result', async () => {
  const { unmount } = render(<AuthProvider><State /></AuthProvider>);
  mockUnsubscribe.mockClear();
  unmount();
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  await act(async () => { mockResolve({ data: { session: session('owner') } }); });
});
