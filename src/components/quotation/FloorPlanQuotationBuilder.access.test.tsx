import { fireEvent, render, screen } from '@testing-library/react';
import { FloorPlanQuotationBuilder } from './FloorPlanQuotationBuilder';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { draftFixture } from '@/test/floor-plan-fixtures';
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) } } }));
const paywall = jest.fn(); const refresh = jest.fn(); const onStart = jest.fn();
let access = { isPro: false, loading: true, status: 'inactive', setPaywallOpen: paywall, refreshSubscription: refresh };
const app = () => <FloorPlanQuotationBuilder mode={null} onStart={onStart} onClose={jest.fn()} getCurrentDraft={draftFixture} onApply={jest.fn()} clients={[]} />;
beforeEach(() => { jest.clearAllMocks(); access = { ...access, isPro: false, loading: true, status: 'inactive' }; (useSubscription as jest.Mock).mockImplementation(() => access); });
it('never opens the AI chooser while checking access, then opens the paywall on the first free-user click', () => {
  const view = render(app()); const button = screen.getByRole('button', { name: 'Checking Pro access' });
  expect(button).toBeDisabled(); fireEvent.click(button);
  expect(screen.queryByText('Floor Plan Analysis')).not.toBeInTheDocument(); expect(paywall).not.toHaveBeenCalled();
  access = { ...access, loading: false }; view.rerender(app());
  fireEvent.click(screen.getByRole('button', { name: 'Build with AI - Pro required' }));
  expect(paywall).toHaveBeenCalledWith(true, 'Build with AI');
  expect(screen.queryByText('Floor Plan Analysis')).not.toBeInTheDocument(); expect(onStart).not.toHaveBeenCalled();
});
it('allows the chooser only for a verified Pro user and removes it when access is lost', () => {
  access = { ...access, loading: false, isPro: true }; const view = render(app());
  fireEvent.click(screen.getByRole('button', { name: 'Build with AI' }));
  expect(screen.getByText('Floor Plan Analysis')).toBeVisible(); expect(screen.getByText('AI Quotation Builder')).toBeVisible();
  access = { ...access, isPro: false }; view.rerender(app());
  expect(screen.queryByText('Floor Plan Analysis')).not.toBeInTheDocument();
});
it('retries a failed entitlement check rather than showing a paywall or chooser', () => {
  access = { ...access, loading: false, status: 'unavailable' }; render(app());
  fireEvent.click(screen.getByRole('button', { name: 'Retry Pro access check' }));
  expect(refresh).toHaveBeenCalledTimes(1); expect(paywall).not.toHaveBeenCalled();
  expect(screen.queryByText('Floor Plan Analysis')).not.toBeInTheDocument();
});
