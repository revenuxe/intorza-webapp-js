import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuotationTiers } from './QuotationTiers';
import { quotationsApi } from '@/lib/api';
import type { QuotationTierGroup } from '@/lib/quotationTiers';
jest.mock('@/lib/api', () => ({ quotationsApi: { nameTier: jest.fn(), createTier: jest.fn() } }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: (amount: number) => `Rs ${amount}` }) }));
const group: QuotationTierGroup = { root_id: 'standard', tiers: [
  { id: 'standard', tier_name: 'Standard', reference_no: 'QNO-000001', status: 'draft', grand_total: 100, snapshot: { grand_total: 100, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Wardrobe', product_details: 'Plywood', sft_area: 1, rate_per_sft: 100, amount: 100 }] }] } },
  { id: 'luxury', tier_name: 'Luxury', reference_no: 'QNO-000002', status: 'draft', grand_total: 300, snapshot: { grand_total: 300, sections: [{ section_name: 'Bedroom', items: [{ product_name: 'Wardrobe', product_details: 'Oak veneer', sft_area: 1, rate_per_sft: 300, amount: 300 }] }] } },
] };
const props = () => ({ group, activeId: 'standard', onRefresh: jest.fn(async () => {}), onSelect: jest.fn(), onEdit: jest.fn(), onExport: jest.fn(async () => {}) });
beforeEach(() => { jest.clearAllMocks(); });
it('asks to name the original quotation the first time without changing its items', async () => {
  const p = props();
  render(<QuotationTiers {...p} group={{ root_id: 'standard', tiers: [{ ...group.tiers[0], tier_name: null }] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tier' }));
  expect(screen.getByText('Name your first tier')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save tier name' }));
  await waitFor(() => expect(quotationsApi.nameTier).toHaveBeenCalledWith('standard','Standard'));
  expect(quotationsApi.createTier).not.toHaveBeenCalled();
  await waitFor(() => expect(p.onRefresh).toHaveBeenCalled());
});
it('copies the active tier then opens the new tier for editing', async () => {
  jest.mocked(quotationsApi.createTier).mockResolvedValue({ data: { id: 'basic' } });
  const p = props(); render(<QuotationTiers {...p} activeId="luxury" />);
  fireEvent.click(screen.getByRole('button', { name: 'Tier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create another tier' }));
  expect(screen.getByText(/Copy Luxury with the same client/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Basic' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create tier and edit' }));
  await waitFor(() => expect(quotationsApi.createTier).toHaveBeenCalledWith('luxury','Basic'));
  expect(p.onEdit).toHaveBeenCalledWith('basic');
});
it('compares saved specifications/prices and shares the explicitly chosen tier', async () => {
  const p = props(); render(<QuotationTiers {...p} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Compare tiers' }));
  expect(screen.getByRole('region', { name: 'Tier comparison' })).toBeVisible();
  expect(screen.getByText('Plywood')).toBeVisible();
  expect(screen.getByText('Oak veneer')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Share Luxury' }));
  await waitFor(() => expect(p.onExport).toHaveBeenCalledWith('luxury',true));
  fireEvent.click(screen.getByRole('button', { name: 'Open Luxury' }));
  expect(p.onSelect).toHaveBeenCalledWith('luxury');
});
it('keeps the form open and reports duplicate names without opening another tier', async () => {
  jest.mocked(quotationsApi.createTier).mockRejectedValue(new Error('duplicate key violates unique constraint'));
  const p = props(); render(<QuotationTiers {...p} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tier' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create another tier' }));
  fireEvent.change(screen.getByLabelText('Tier name'), { target: { value: 'Luxury' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create tier and edit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already has a tier with that name');
  expect(p.onEdit).not.toHaveBeenCalled();
});
