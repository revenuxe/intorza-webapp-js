import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaywallModal } from './PaywallModal';
import { CoinWallet } from './CoinWallet';

jest.mock('@/lib/navigation', () => ({ useNavigate: () => jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: { access_token: 'test' } }) }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ settings: { countryCode: 'IN' }, countryConfig: { flag: '' } }) }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ paywallOpen: true, setPaywallOpen: jest.fn(), refreshSubscription: jest.fn(), isPro: true }) }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: null } }), getSession: async () => ({ data: { session: { access_token: 'test' } } }) },
  functions: { invoke: async () => ({ data: { keyId: 'test', orderId: 'order_test', amount: 10000, currency: 'INR', coins: 100 } }) },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: jest.fn(),
} }));

for (const flow of ['Pro', 'coins'] as const) {
  it(`${flow} checkout releases the dialog lock before opening and restores it on cancellation`, async () => {
    let dismiss: () => void = () => {};
    let dialogAtOpen: HTMLElement | null = null;
    let pointerEventsAtOpen = '';
    let checkoutReceivedFocus = false;
    const open = jest.fn(() => {
      dialogAtOpen = screen.queryByRole('dialog');
      pointerEventsAtOpen = document.body.style.pointerEvents;
      const paymentInput = document.createElement('input');
      document.body.appendChild(paymentInput);
      paymentInput.focus();
      checkoutReceivedFocus = document.activeElement === paymentInput;
      paymentInput.remove();
    });
    window.Razorpay = jest.fn(function (options: { modal: { ondismiss: () => void } }) {
      dismiss = options.modal.ondismiss;
      return { open };
    });
    render(flow === 'Pro' ? <PaywallModal /> : <CoinWallet />);
    if (flow === 'coins') fireEvent.click(screen.getByRole('button', { name: /coins/ }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: flow === 'Pro' ? /Get Pro for/ : /Add 100 coins/ }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(dialogAtOpen).toBeNull();
    expect(pointerEventsAtOpen).not.toBe('none');
    expect(checkoutReceivedFocus).toBe(true);
    act(() => dismiss());
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: flow === 'Pro' ? /Get Pro for/ : /Add 100 coins/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: flow === 'Pro' ? /Get Pro for/ : /Add 100 coins/ }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(dialogAtOpen).toBeNull();
    expect(pointerEventsAtOpen).not.toBe('none');
    expect(checkoutReceivedFocus).toBe(true);
    act(() => dismiss());
  });

  it(`${flow} restores a usable dialog if Razorpay fails to open`, async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const open = jest.fn(() => { throw new Error('Checkout unavailable'); });
    window.Razorpay = jest.fn(function () { return { open }; });
    try {
      render(flow === 'Pro' ? <PaywallModal /> : <CoinWallet />);
      if (flow === 'coins') fireEvent.click(screen.getByRole('button', { name: /coins/ }));
      fireEvent.click(screen.getByRole('button', { name: flow === 'Pro' ? /Get Pro for/ : /Add 100 coins/ }));
      await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
      expect(await screen.findByRole('dialog')).toBeVisible();
      expect(screen.getByRole('button', { name: flow === 'Pro' ? /Get Pro for/ : /Add 100 coins/ })).toBeEnabled();
    } finally { consoleError.mockRestore(); }
  });
}
