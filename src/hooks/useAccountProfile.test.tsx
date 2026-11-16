import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccountProfile } from './useAccountProfile';
let mockOwner = 'first';
const mockLoad = jest.fn();
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockOwner ? { id: mockOwner } : null, loading: false }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let owner = '';
  const query = { select: () => query, eq: (_: string, id: string) => { owner = id; return query; }, abortSignal: () => query, single: () => mockLoad(owner) };
  return query;
} } }));
function Observer({ index }: { index: number }) { const { data } = useAccountProfile(); return <span data-testid={`profile-${index}`}>{data?.company_name || 'Loading'}</span>; }
beforeEach(() => { mockOwner = 'first'; mockLoad.mockReset(); mockLoad.mockImplementation(async owner => ({ data: { company_name: owner }, error: null })); });
it('shares one profile request across all 72 item observers', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{Array.from({ length: 72 }, (_, index) => <Observer key={index} index={index} />)}</QueryClientProvider>);
  await waitFor(() => expect(screen.getByTestId('profile-71')).toHaveTextContent('first'));
  expect(mockLoad).toHaveBeenCalledTimes(1);
});
it('does not display a prior account profile while the next account loads', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => <QueryClientProvider client={client}><Observer index={0} /></QueryClientProvider>;
  const view = render(tree());
  await waitFor(() => expect(screen.getByTestId('profile-0')).toHaveTextContent('first'));
  mockOwner = 'second'; mockLoad.mockReturnValue(new Promise(() => {}));
  view.rerender(tree());
  expect(screen.getByTestId('profile-0')).toHaveTextContent('Loading');
  expect(mockLoad).toHaveBeenCalledTimes(2);
});
