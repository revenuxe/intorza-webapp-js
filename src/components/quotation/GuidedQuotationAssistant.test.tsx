import { fireEvent, render, screen } from '@testing-library/react';
import { GuidedQuotationAssistant } from './GuidedQuotationAssistant';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
function fixture(): VoiceDraft { return { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] }; }
beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
it('shows one field, fills the form immediately and supports Back with no paid requests', () => {
  let current = fixture(); const change = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
  render(<GuidedQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={change} onClose={jest.fn()} onLive={jest.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'OpenAI voice (paid, AI-generated)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start guide' }));
  fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Rahul' } }); fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(current.project.clientName).toBe('Rahul'); expect(screen.getByLabelText('Quotation title')).toHaveFocus(); expect(screen.queryByLabelText('Customer name')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Back' })); expect(current.project.clientName).toBe(''); expect(screen.getByLabelText('Customer name')).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
});
it('speaks Hinglish while the question and input stay English', () => {
  const speak = jest.fn(); const cancel = jest.fn();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel, resume: jest.fn(), getVoices: () => [{ lang: 'hi-IN' }], speaking: false } });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(public text: string) {} } });
  const view = render(<GuidedQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} onLive={jest.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'OpenAI voice (paid, AI-generated)' }));
  fireEvent.change(screen.getByLabelText('Spoken language'), { target: { value: 'hi-IN' } }); fireEvent.click(screen.getByRole('button', { name: 'Start guide' }));
  expect(speak.mock.calls[0][0].text).toBe('Customer ka naam yahan type kijiye.'); expect(screen.getByLabelText('Customer name')).toBeInTheDocument();
  expect(screen.getByText('Please type the customer name here.')).toBeInTheDocument(); view.unmount(); expect(cancel).toHaveBeenCalled();
});
it('preserves manual edits and reports a conflict', () => {
  let current = fixture(); const onChange = jest.fn();
  render(<GuidedQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} onLive={jest.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'OpenAI voice (paid, AI-generated)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start guide' })); current = { ...current, project: { ...current.project, clientName: 'Manual' } };
  fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Rahul' } }); fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(onChange).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('changed the main form');
});
