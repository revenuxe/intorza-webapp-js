import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

it('rechecks the balance before uploading and preserves selected files on rejection', async () => {
  mockBalance = 60;
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  await waitFor(() => expect(mockReadWallet).toHaveBeenCalled());
  const file = new File(['%PDF-1.7'], 'plan.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Floor plan files'), { target: { files: [file] } });
  mockBalance = 5;
  const send = jest.spyOn(XMLHttpRequest.prototype, 'send');
  fireEvent.click(screen.getByRole('button', { name: 'Analyse Floor Plan' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('You need 40 coins; your balance is 5. Top up 35 coins'));
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByText('plan.pdf')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Top up coins' })).toBeVisible();
  send.mockRestore();
});
it('blocks quotation generation before sending an AI request with only 5 coins', async () => {
  render(<FloorPlanQuotationBuilder {...props} mode="details" />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('radio', { name: /Sqft/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Generate Quotation' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('You need 20 coins; your balance is 5. Top up 15 coins'));
  expect(global.fetch).not.toHaveBeenCalled();
  expect(props.onApply).not.toHaveBeenCalled();
});
it('does not upload when the wallet check fails', async () => {
  mockWalletFailure = true;
  render(<FloorPlanQuotationBuilder {...props} mode="upload" />);
  fireEvent.change(screen.getByLabelText('Floor plan files'), { target: { files: [new File(['pdf'], 'plan.pdf', { type: 'application/pdf' })] } });
  const send = jest.spyOn(XMLHttpRequest.prototype, 'send');
  fireEvent.click(screen.getByRole('button', { name: 'Analyse Floor Plan' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not check your coin balance'));
  expect(send).not.toHaveBeenCalled();
  send.mockRestore();
});
