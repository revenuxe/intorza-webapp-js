import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuotationDetail from './QuotationDetail';
import { generateQuotationPDF } from '@/lib/pdfGenerator';
const mockNavigate = jest.fn();
let mockSelected = 'luxury';
const mockSave = jest.fn();
const mockEq = jest.fn();
const mockQuotes = {
  standard: { id: 'standard', tier_name: 'Standard', tier_parent_id: null, reference_no: 'QNO-ROOT', quotation_title: 'Bedroom', project_name: 'Bedroom', client_name: 'Client', grand_total: 100, status: 'draft' },
  luxury: { id: 'luxury', tier_name: 'Luxury', tier_parent_id: 'standard', reference_no: 'QNO-CHILD', quotation_title: 'Bedroom', project_name: 'Bedroom', client_name: 'Client', grand_total: 300, status: 'draft' },
};
jest.mock('@/lib/navigation', () => ({ useParams: () => ({ id: 'standard' }), useNavigate: () => mockNavigate, useSearchParams: () => [new URLSearchParams({ tier: mockSelected })] }));
jest.mock('@/lib/api', () => ({ quotationsApi: { tiers: async () => ({ data: { root_id: 'standard', tiers: Object.values(mockQuotes) } }) } }));
jest.mock('@/components/quotation/QuotationVersions', () => ({ QuotationVersions: ({ quotationId }: { quotationId: string }) => <span>History for {quotationId}</span> }));
jest.mock('@/components/quotation/QuotationTiers', () => ({ QuotationTiers: ({ onExport, onSelect }: { onExport: (id: string, share: boolean) => void; onSelect: (id: string) => void }) => <><button onClick={() => onExport('standard',true)}>Share Standard</button><button onClick={() => onSelect('luxury')}>Open Luxury</button></> }));
jest.mock('@/hooks/useInlineFeedback', () => ({ useInlineFeedback: () => ({ toast: jest.fn(), feedback: null }) }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => ({ checkProFeature: jest.fn() }) }));
jest.mock('@/hooks/useLocalization', () => ({ useLocalization: () => ({ formatCurrency: String, formatDateShort: String, settings: { taxShortLabel: 'GST' } }) }));
jest.mock('@/lib/libraryDefaults', () => ({ getLibraryTerms: async () => [] }));
jest.mock('@/lib/pdfThemes', () => ({ getEditorSettings: () => ({}) }));
jest.mock('@/components/CustomizeFieldsDrawer', () => ({ getQuotationSettings: () => ({}) }));
jest.mock('@/lib/pdfGenerator', () => ({ generateQuotationPDF: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  from: (table: string) => {
    let id = '';
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { mockEq(table,key,value); if (key === 'id' || key === 'quotation_id') id=value; return query; },
      single: async () => ({ data: table === 'quotations' ? mockQuotes[id as keyof typeof mockQuotes] : {}, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      order: async () => ({ data: table === 'quotation_sections' ? [{ section_name: 'Bedroom', quotation_items: [{ id: 'item', product_name: `${id} wardrobe`, amount: id === 'standard' ? 100 : 300 }] }] : [], error: null }),
    };
    return query;
  },
} }));
beforeEach(() => {
  jest.clearAllMocks(); mockSelected='luxury';
  jest.mocked(generateQuotationPDF).mockResolvedValue({ output: () => new Blob(['pdf']), save: mockSave } as never);
});
it('opens the selected tier and scopes version history to that tier', async () => {
  render(<QuotationDetail />);
  expect(await screen.findByText('History for luxury')).toBeVisible();
  expect(screen.getByText('Bedroom — Luxury')).toBeVisible();
  expect(screen.getByText('Ref QNO: QNO-ROOT')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Open Luxury' }));
  expect(mockNavigate).toHaveBeenCalledWith('/quotations/standard?tier=luxury');
});
it('exports the requested Standard option while Luxury is being viewed', async () => {
  render(<QuotationDetail />);
  fireEvent.click(await screen.findByRole('button', { name: 'Share Standard' }));
  await waitFor(() => expect(generateQuotationPDF).toHaveBeenCalledWith(expect.objectContaining({
    quotationId: 'standard', quotationTitle: 'Bedroom — Standard', referenceNo: 'QNO-ROOT', grandTotal: 100,
    sections: [expect.objectContaining({ items: [expect.objectContaining({ productName: 'standard wardrobe' })] })],
  })));
  expect(mockSave).toHaveBeenCalledWith('Client-Standard.pdf');
});
it('rejects tier IDs that do not belong to the quotation before reading their content', async () => {
  mockSelected='unrelated';
  const originalError = jest.spyOn(console,'error').mockImplementation(() => {});
  render(<QuotationDetail />);
  expect(await screen.findByText('Quotation not found')).toBeVisible();
  expect(mockEq).not.toHaveBeenCalledWith('quotations','id','unrelated');
  originalError.mockRestore();
});
