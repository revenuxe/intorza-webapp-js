import { render, screen } from '@testing-library/react';
import Providers from './providers';
import { Layout } from '@/components/Layout';

jest.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null }),
}));
jest.mock('@/contexts/SubscriptionContext', () => ({ SubscriptionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/FeedbackProvider', () => ({ FeedbackProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/WelcomeCoinsDialog', () => ({ WelcomeCoinsDialog: () => <div>Welcome wallet popup</div> }));
jest.mock('@/components/Header', () => ({ Header: () => null }));
jest.mock('@/components/Sidebar', () => ({ Sidebar: () => null }));
jest.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
jest.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
jest.mock('@/components/PaywallModal', () => ({ PaywallModal: () => null }));
jest.mock('@/components/PWAInstallPrompt', () => ({ PWAInstallPrompt: () => null }));
jest.mock('@/components/OfflineIndicator', () => ({ OfflineIndicator: () => null }));
jest.mock('@/components/next/ServiceWorkerRegistration', () => ({ ServiceWorkerRegistration: () => null }));

it('never mounts the wallet popup in global providers used by team/admin pages', () => {
  render(<Providers><div>Team dashboard</div></Providers>);
  expect(screen.getByText('Team dashboard')).toBeInTheDocument();
  expect(screen.queryByText('Welcome wallet popup')).not.toBeInTheDocument();
});

it('mounts the welcome popup only in the quotation workspace layout', () => {
  render(<Providers><Layout>Quotation workspace</Layout></Providers>);
  expect(screen.getByText('Welcome wallet popup')).toBeInTheDocument();
});
