import { render, screen, waitFor } from '@testing-library/react';
import { WorkspaceAccountGuard } from './WorkspaceAccountGuard';

const mockNavigate = jest.fn();
const mockMaybeSingle = jest.fn();
let mockAuth: { user: { id: string; user_metadata: Record<string, unknown> } | null; loading: boolean };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/lib/navigation', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@/components/GlobalLoader', () => ({ GlobalLoader: () => <div>Loading</div> }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }) } }));

beforeEach(() => {
  mockNavigate.mockClear();
  mockAuth = { user: { id: 'account', user_metadata: {} }, loading: false };
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  sessionStorage.clear();
});

it('keeps regular owners in the quotation workspace', async () => {
  render(<WorkspaceAccountGuard>Quotation workspace</WorkspaceAccountGuard>);
  await waitFor(() => expect(screen.getByText('Quotation workspace')).toBeInTheDocument());
  expect(mockNavigate).not.toHaveBeenCalled();
});

it('sends approved members to their team dashboard without showing the quotation workspace', async () => {
  mockMaybeSingle.mockResolvedValue({ data: { id: 'member' }, error: null });
  sessionStorage.setItem('returnPath', '/quotations');
  render(<WorkspaceAccountGuard>Quotation workspace</WorkspaceAccountGuard>);
  expect(screen.queryByText('Quotation workspace')).not.toBeInTheDocument();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/team/dashboard', { replace: true }));
  expect(sessionStorage.getItem('returnPath')).toBeNull();
});

it.each(['pending', 'rejected'])('sends a %s team account to team login', async () => {
  mockAuth.user!.user_metadata = { is_team_member: true, join_company_id: 'organization' };
  render(<WorkspaceAccountGuard>Quotation workspace</WorkspaceAccountGuard>);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/team/login', { replace: true }));
  expect(screen.queryByText('Quotation workspace')).not.toBeInTheDocument();
});

it('does not allow a failed account check into the quotation workspace', async () => {
  mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Network error' } });
  render(<WorkspaceAccountGuard>Quotation workspace</WorkspaceAccountGuard>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument());
  expect(screen.queryByText('Quotation workspace')).not.toBeInTheDocument();
});
