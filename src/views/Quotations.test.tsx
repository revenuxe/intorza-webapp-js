import { fireEvent, render, screen } from '@testing-library/react';
import Quotations from './Quotations';
import { quotationsApi } from '@/lib/api';
const mockNavigate = jest.fn();
jest.mock('@/lib/navigation', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
jest.mock('@/lib/api', () => ({ quotationsApi: { list: jest.fn() } }));
jest.mock('@/hooks/useInlineFeedback', () => ({ useInlineFeedback: () => ({ toast: jest.fn(), feedback: null }) }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: String, formatDate: String }) }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ isPro: true, loading: false }) }));
it('links a draft card to its quotation page while keeping Edit Draft independent', async () => {
  jest.mocked(quotationsApi.list).mockResolvedValue({ data: [{ id: 'quote-1', quotation_title: 'Master Bedroom Set', client_name: 'Client', status: 'draft', reference_no: 'QNO-00006C' }] });
  render(<Quotations />);
  expect(await screen.findByRole('link', { name: 'Master Bedroom Set' })).toHaveAttribute('href', '/quotations/quote-1');
  fireEvent.click(screen.getByRole('button', { name: 'Edit Draft' }));
  expect(mockNavigate).toHaveBeenCalledWith('/?id=quote-1');
});
