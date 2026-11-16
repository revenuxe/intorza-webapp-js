import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuotationVersions } from './QuotationVersions';
import { quotationsApi } from '@/lib/api';
jest.mock('@/lib/api', () => ({ quotationsApi: { versions: jest.fn(), version: jest.fn(), revertVersion: jest.fn() } }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: (value: number) => `Rs ${value}`, formatDateShort: () => '16/11/2026' }) }));
const versions = [2, 1].map(number => ({ id: `v${number}`, quotation_id: 'quote', version_number: number, saved_at: '2026-11-16T10:00:00Z' }));
const snapshot = (number: number) => ({ quotation_title: 'Bedroom', client_name: 'Client', grand_total: number * 100, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Wardrobe', amount: number * 100 }] }] });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(quotationsApi.versions).mockResolvedValue({ data: versions });
  jest.mocked(quotationsApi.version).mockImplementation(async (_id, number) => ({ data: { ...versions.find(version => version.version_number === number)!, snapshot: snapshot(number) } }));
  jest.mocked(quotationsApi.revertVersion).mockResolvedValue({ data: {} });
});
it('opens history, previews an older version and reverts only after confirmation', async () => {
  const restored = jest.fn(async () => {});
  render(<QuotationVersions quotationId="quote" onRestored={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  expect(await screen.findByRole('button', { name: 'Latest version' })).toBeDisabled();
  expect(screen.getByText('Changes from Version 1')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Revert to this version' }));
  expect(quotationsApi.revertVersion).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revert' }));
  await waitFor(() => expect(quotationsApi.revertVersion).toHaveBeenCalledWith('quote', 'v1', 2));
  await waitFor(() => expect(restored).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('Version 1 restored and saved as a new version.')).toBeVisible();
});
it('reports stale-version failures without claiming restoration succeeded', async () => {
  jest.mocked(quotationsApi.revertVersion).mockRejectedValue(new Error('Quotation has changed. Refresh versions before reverting.'));
  const restored = jest.fn(async () => {});
  render(<QuotationVersions quotationId="quote" onRestored={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  await screen.findByRole('button', { name: 'Latest version' });
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Revert to this version' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Quotation has changed');
  expect(restored).not.toHaveBeenCalled();
});
