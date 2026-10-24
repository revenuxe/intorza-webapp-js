import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FloorPlanQuotationBuilder } from './FloorPlanQuotationBuilder';
import { draftFixture } from '@/test/floor-plan-fixtures';

let mockBalance = 5;
let mockWalletFailure = false;
const mockReadWallet = jest.fn(async () => ({ data: { balance: mockBalance }, error: mockWalletFailure ? { message: 'Unavailable' } : null }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ isPro: true, loading: false, status: 'active', setPaywallOpen: jest.fn(), refreshSubscription: jest.fn() }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }), getSession: async () => ({ data: { session: { access_token: 'session' } } }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockReadWallet }) }) }),
} }));
const props = { onStart: jest.fn(), onClose: jest.fn(), getCurrentDraft: draftFixture, onApply: jest.fn(), clients: [] };
beforeEach(() => { jest.clearAllMocks(); mockBalance = 5; mockWalletFailure = false; global.fetch = jest.fn(); });


it.each([0, 5, 39])('shows the floor-plan shortfall and disables upload with %i coins', async balance => {
  mockBalance = balance;
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  const popup = await screen.findByRole('dialog', { name: 'Top up to use AI' });
  expect(popup).toHaveTextContent('Your balance'+balance+' coins');
  expect(popup).toHaveTextContent('Required40 coins');
  expect(popup).toHaveTextContent('Coins to add'+(40-balance)+' coins');
  fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Analyse Floor Plan' })).toBeDisabled();
  expect(screen.getByLabelText('Floor plan files')).toBeDisabled();
});
it.each([0, 5, 19])('blocks the quotation flow and explains the shortfall with %i coins', async balance => {
  mockBalance = balance;
  render(<FloorPlanQuotationBuilder {...props} mode="details" />);
  const popup = await screen.findByRole('dialog', { name: 'Top up to use AI' });
  expect(popup).toHaveTextContent('Required20 coins');
  expect(popup).toHaveTextContent('Coins to add'+(20-balance)+' coins');
  fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(global.fetch).not.toHaveBeenCalled();
});
it('opens the wallet and unlocks upload only after a top-up is verified', async () => {
  const openWallet = jest.fn();
  window.addEventListener('intorza:open-wallet', openWallet);
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  await screen.findByRole('dialog', { name: 'Top up to use AI' });
  fireEvent.click(screen.getByRole('button', { name: 'Top up coins' }));
  expect(openWallet).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  mockBalance = 40;
  act(() => { window.dispatchEvent(new Event('intorza:wallet-changed')); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Floor plan files'), { target: { files: [new File(['pdf'], 'plan.pdf', { type: 'application/pdf' })] } });
  expect(screen.getByRole('button', { name: 'Analyse Floor Plan' })).toBeEnabled();
  window.removeEventListener('intorza:open-wallet', openWallet);
});
it('keeps actions disabled while the initial wallet read is pending', async () => {
  let finish!: (value: { data: { balance: number }; error: null }) => void;
  mockReadWallet.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Analyse Floor Plan' })).toBeDisabled();
  await waitFor(() => expect(finish).toEqual(expect.any(Function)));
  await act(async () => { finish({ data: { balance: 40 }, error: null }); });
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled();
});
it('keeps actions disabled when balance verification fails and supports retry', async () => {
  mockWalletFailure = true;
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  await screen.findByText('Could not verify your coin balance.');
  expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled();
  mockWalletFailure = false; mockBalance = 40;
  fireEvent.click(screen.getByRole('button', { name: 'Retry balance check' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled());
});

it('preserves selected files and stays locked after a partial top-up', async () => {
  mockBalance = 40;
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Floor plan files'), { target: { files: [new File(['pdf'], 'plan.pdf', { type: 'application/pdf' })] } });
  mockBalance = 30;
  act(() => { window.dispatchEvent(new Event('intorza:wallet-changed')); });
  expect(await screen.findByRole('dialog', { name: 'Top up to use AI' })).toHaveTextContent('Coins to add10 coins');
  fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
  expect(screen.getByText('plan.pdf')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Analyse Floor Plan' })).toBeDisabled();
});
it('unlocks the quotation flow with exactly 20 coins after verification', async () => {
  render(<FloorPlanQuotationBuilder {...props} mode="details" />);
  await screen.findByRole('dialog', { name: 'Top up to use AI' });
  fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
  mockBalance = 20;
  act(() => { window.dispatchEvent(new Event('intorza:wallet-changed')); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
});
