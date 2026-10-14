import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DescribeQuotation } from './DescribeQuotation';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }) } } }));
function draft(): VoiceDraft { return { version: 1, revision: 0, project: { clientName: '', projectTitle: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: 'Bedroom', items: [] }] }; }
it('previews an English interpretation and applies only after acceptance', async () => {
  const before = draft(); const next = draft(); next.project.clientName = 'Aslam';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ draft: next, displayReply: 'What is the title?', transcript: 'For Aslam, bedroom wardrobe.', changed: true }) });
  const accept = jest.fn();
  render(<DescribeQuotation draft={before} language="hi-IN" onAccept={accept} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Describe quotation details'), { target: { value: 'Aslam ke liye bedroom wardrobe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview with AI' })); await screen.findByText('For Aslam, bedroom wardrobe.'); expect(accept).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use these details' })); expect(accept).toHaveBeenCalledWith(next, JSON.stringify(before));
});
it('rejects non-English quotation text and cancels on unmount', async () => {
  const next = draft(); next.project.clientName = 'असलम';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ draft: next, displayReply: 'Continue', transcript: 'For Aslam', changed: true }) });
  const accept = jest.fn(); const view = render(<DescribeQuotation draft={draft()} language="hi-IN" onAccept={accept} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Describe quotation details'), { target: { value: 'Aslam' } }); fireEvent.click(screen.getByRole('button', { name: 'Preview with AI' }));
  await screen.findByRole('alert'); expect(accept).not.toHaveBeenCalled();
  view.unmount(); await waitFor(() => expect((fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(true));
});
