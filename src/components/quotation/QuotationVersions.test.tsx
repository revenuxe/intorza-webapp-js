import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuotationVersions } from './QuotationVersions';
import { quotationsApi } from '@/lib/api';
jest.mock('@/lib/api', () => ({ quotationsApi: { versions: jest.fn(), versionBatch: jest.fn(), revertVersion: jest.fn() } }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: (value: number) => `Rs ${value}`, formatDateShort: () => '16/11/2026' }) }));
const versions = [2, 1].map(number => ({ id: `v${number}`, quotation_id: 'quote', version_number: number, saved_at: '2026-11-16T10:00:00Z' }));
const snapshot = (number: number) => ({ quotation_title: 'Bedroom', client_name: 'Client', grand_total: number * 100, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Wardrobe', amount: number * 100 }, ...(number > 1 ? [{ product_name: 'Bed', amount: 100 }] : [])] }] });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(quotationsApi.versions).mockResolvedValue({ data: versions });
  jest.mocked(quotationsApi.versionBatch).mockImplementation(async (_id, numbers) => ({ data: numbers.map(number => ({ ...versions.find(version => version.version_number === number)!, snapshot: snapshot(number) })) }));
  jest.mocked(quotationsApi.revertVersion).mockResolvedValue({ data: {} });
});
it('lists recent changes without the quotation and reverts an expanded version only after confirmation', async () => {
  const restored = jest.fn(async () => {});
  render(<QuotationVersions quotationId="quote" onRestored={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  expect(await screen.findByText('First saved version')).toBeVisible();
  expect(screen.getByText('Added Bed to Bedroom')).toBeVisible();
  expect(screen.queryByText(/Subtotal|Grand total|Before:|After:/)).not.toBeInTheDocument();
  expect(screen.queryByText('Bedroom')).not.toBeInTheDocument();
  expect(screen.queryByText('Client')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revert to this version' })).not.toBeInTheDocument();
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
  await screen.findByText('First saved version');
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Revert to this version' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Quotation has changed');
  expect(restored).not.toHaveBeenCalled();
});

it('expands just the selected changes and keeps the latest version non-revertible', async () => {
  render(<QuotationVersions quotationId="quote" onRestored={async () => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  await screen.findByText('First saved version');
  const latest = screen.getByRole('button', { name: /Version 2 Latest/ });
  expect(latest).toHaveAttribute('aria-expanded','false');
  fireEvent.click(latest);
  expect(screen.getByRole('list', { name: 'Changes in Version 2' })).toBeVisible();
  expect(screen.getByRole('list', { name: 'Changes in Version 2' })).toHaveTextContent('Added Bed to Bedroom');
  expect(screen.queryByText(/Before:|After:/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revert to this version' })).not.toBeInTheDocument();
  fireEvent.click(latest);
  expect(screen.queryByRole('list', { name: 'Changes in Version 2' })).not.toBeInTheDocument();
});

it('switches to the selected tier history and reverts only that tier', async () => {
  const restored = jest.fn(async () => {});
  render(<QuotationVersions quotationId="quote" tiers={[{ id: 'quote', tier_name: 'Standard' }, { id: 'luxury', tier_name: 'Luxury' }]} onRestored={restored} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  await screen.findByText('First saved version');
  expect(screen.getByRole('combobox', { name: 'Tier' })).toHaveValue('quote');
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Revert to this version' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Tier' }), { target: { value: 'luxury' } });
  expect(screen.queryByRole('button', { name: 'Confirm revert' })).not.toBeInTheDocument();
  await waitFor(() => expect(quotationsApi.versions).toHaveBeenCalledWith('luxury'));
  await screen.findByText('First saved version');
  expect(quotationsApi.versionBatch).toHaveBeenCalledWith('luxury',[2,1]);
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Revert to this version' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revert' }));
  await waitFor(() => expect(quotationsApi.revertVersion).toHaveBeenCalledWith('luxury','v1',2));
  expect(await screen.findByText('Version 1 of Luxury restored and saved as a new version.')).toBeVisible();
  expect(restored).toHaveBeenCalledTimes(1);
});

it('ignores an older tier response arriving after the user switches tiers', async () => {
  let finishOldRequest!: (result: Awaited<ReturnType<typeof quotationsApi.versionBatch>>) => void;
  jest.mocked(quotationsApi.versions).mockImplementation(async id => ({ data: versions.map(version => ({ ...version, id: `${id}-${version.id}`, quotation_id: id })) }));
  jest.mocked(quotationsApi.versionBatch).mockImplementation(async (id, numbers) => {
    if (id === 'quote') return new Promise(resolve => { finishOldRequest = resolve; });
    return { data: numbers.map(number => ({ ...versions.find(version => version.version_number === number)!, id: `${id}-v${number}`, quotation_id: id, snapshot: snapshot(number) })) };
  });
  render(<QuotationVersions quotationId="quote" tiers={[{ id: 'quote', tier_name: 'Standard' }, { id: 'luxury', tier_name: 'Luxury' }]} onRestored={async () => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
  await waitFor(() => expect(quotationsApi.versionBatch).toHaveBeenCalledWith('quote',[2,1]));
  fireEvent.change(screen.getByRole('combobox', { name: 'Tier' }), { target: { value: 'luxury' } });
  await screen.findByText('First saved version');
  await act(async () => finishOldRequest({ data: [{ ...versions[1], snapshot: snapshot(1) }] }));
  fireEvent.click(screen.getByRole('button', { name: /Version 1 16/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Revert to this version' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revert' }));
  await waitFor(() => expect(quotationsApi.revertVersion).toHaveBeenCalledWith('luxury','luxury-v1',2));
});
