import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from './SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: jest.fn() } }));
let auth = { user: { id: 'owner' }, session: { access_token: 'token' }, loading: false };
const single = jest.fn(); const callback = jest.fn();
const profile = (isPro = false) => ({ data: { is_pro: isPro, pro_plan: 'monthly', pro_expiry: '2099-01-01', pro_since: null, payment_status: 'active' }, error: null });
function deferred() { let resolve!: (value: ReturnType<typeof profile>) => void; const promise = new Promise<ReturnType<typeof profile>>(done => { resolve = done; }); return { promise, resolve }; }
function View() {
  const subscription = useSubscription();
  return <><span data-testid="status">{subscription.loading ? 'checking' : subscription.isPro ? 'pro' : subscription.status === 'unavailable' ? 'unavailable' : 'free'}</span>
    <span data-testid="paywall">{String(subscription.paywallOpen)}</span>
    <button onClick={() => subscription.checkProFeature('AI', callback)}>Protected action</button>
    <button onClick={() => void subscription.refreshSubscription()}>Refresh</button></>;
}
const app = () => <SubscriptionProvider><View /></SubscriptionProvider>;
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); auth = { user: { id: 'owner' }, session: { access_token: 'token' }, loading: false };
  (useAuth as jest.Mock).mockImplementation(() => auth);
  (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ single }) }) });
  single.mockResolvedValue(profile());
});
it('blocks callbacks and paywalls until the initial subscription is resolved', async () => {
  const pending = deferred(); single.mockReturnValue(pending.promise);
  render(app());
  expect(screen.getByTestId('status')).toHaveTextContent('checking');
  fireEvent.click(screen.getByText('Protected action'));
  expect(callback).not.toHaveBeenCalled(); expect(screen.getByTestId('paywall')).toHaveTextContent('false');
  await act(async () => pending.resolve(profile(false)));
  fireEvent.click(screen.getByText('Protected action'));
  expect(screen.getByTestId('paywall')).toHaveTextContent('true'); expect(callback).not.toHaveBeenCalled();
});
it('keeps verified Pro status during a same-account token refresh', async () => {
  single.mockResolvedValueOnce(profile(true)); const view = render(app());
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pro'));
  const pending = deferred(); single.mockReturnValue(pending.promise);
  auth = { ...auth, session: { access_token: 'new-token' } }; view.rerender(app());
  expect(screen.getByTestId('status')).toHaveTextContent('pro');
  await act(async () => pending.resolve(profile(true)));
  fireEvent.click(screen.getByText('Protected action')); expect(callback).toHaveBeenCalledTimes(1);
});
it('hides previous-account Pro status immediately and ignores stale responses', async () => {
  const old = deferred(); single.mockReturnValueOnce(old.promise); const view = render(app());
  const next = deferred(); single.mockReturnValueOnce(next.promise);
  auth = { ...auth, user: { id: 'another' } }; view.rerender(app());
  expect(screen.getByTestId('status')).toHaveTextContent('checking');
  await act(async () => old.resolve(profile(true)));
  expect(screen.getByTestId('status')).toHaveTextContent('checking');
  await act(async () => next.resolve(profile(false)));
  expect(screen.getByTestId('status')).toHaveTextContent('free');
});
it('does not grant expired Pro or trust browser storage as entitlement', async () => {
  localStorage.setItem('intorza_pro_status', JSON.stringify({ isPro: true }));
  const result = profile(true); result.data.pro_expiry = '2020-01-01'; single.mockResolvedValue(result);
  render(app()); await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('free'));
  fireEvent.click(screen.getByText('Protected action')); expect(callback).not.toHaveBeenCalled();
});
it('reports a failed check without treating it as a free plan and can retry', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  single.mockResolvedValueOnce({ data: null, error: new Error('offline') }); render(app());
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unavailable'));
  fireEvent.click(screen.getByText('Protected action')); expect(screen.getByTestId('paywall')).toHaveTextContent('false');
  single.mockResolvedValueOnce(profile(true)); fireEvent.click(screen.getByText('Refresh'));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pro')); log.mockRestore();
});
