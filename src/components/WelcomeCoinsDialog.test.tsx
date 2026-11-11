import { render, screen, waitFor } from '@testing-library/react';
import { WelcomeCoinsDialog } from './WelcomeCoinsDialog';

let mockPathname = '/dashboard';
let mockUser: { id: string; user_metadata: Record<string, unknown> } | null;
const mockMaybeSingle = jest.fn();
const mockFrom = jest.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }));
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => mockFrom(), rpc: jest.fn() } }));

beforeEach(() => {
  mockPathname = '/dashboard';
  mockUser = { id: 'owner', user_metadata: {} };
  mockFrom.mockClear();
  mockMaybeSingle.mockResolvedValue({ data: { welcome_claimed_at: null } });
});

it.each(['/admin/login', '/admin/dashboard', '/team', '/team/login', '/team/signup', '/team/dashboard', '/team/project/123'])('suppresses the wallet on %s', path => {
  mockPathname = path;
  render(<WelcomeCoinsDialog />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mockFrom).not.toHaveBeenCalled();
});

it.each([{ is_team_member: true }, { is_team_member: 'true' }, { join_company_id: 'org' }])('suppresses the wallet for team accounts on other pages: %j', metadata => {
  mockUser = { id: 'worker', user_metadata: metadata };
  render(<WelcomeCoinsDialog />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mockFrom).not.toHaveBeenCalled();
});

it('keeps the welcome reward for regular accounts and closes it on navigation to team signup', async () => {
  const view = render(<WelcomeCoinsDialog />);
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  mockPathname = '/team/signup';
  view.rerender(<WelcomeCoinsDialog />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
