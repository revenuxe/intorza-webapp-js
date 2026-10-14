import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoiceQuotationAssistant } from './VoiceQuotationAssistant';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
import type { BrowserRecognition } from '@/lib/quotation-ai/browser-speech';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'owner' } } } }),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
} } }));
function fixture(): VoiceDraft { return { version: 1, revision: 0,
  project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' },
  pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 },
  sections: [{ id: 'room', title: '', items: [] }],
}; }
const unsupported = { available: () => false, create: jest.fn() };
describe('compact live voice assistant', () => {
  it('renders inline with typed fallback and populates incomplete fields immediately', async () => {
    let current = fixture();
    const next = { ...fixture(), project: { ...fixture().project, clientName: 'Rahul' } };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ draft: next, changed: true, reply: 'What should we call this quotation?' }) });
    const onChange = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
    render(<VoiceQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} speechInput={unsupported} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Speak' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'For Rahul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(next, JSON.stringify(fixture())));
    expect(current.project.clientName).toBe('Rahul');
    expect(screen.getByText(/fields updated below/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(current.project.clientName).toBe('');
  });
  it('rejects an incoming change if the user manually edits the form during a request', async () => {
    let current = fixture(); let resolve: (value: unknown) => void;
    global.fetch = jest.fn(() => new Promise(done => { resolve = done; })) as jest.Mock;
    const onChange = jest.fn();
    render(<VoiceQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} speechInput={unsupported} />);
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Rahul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    current = { ...current, project: { ...current.project, clientName: 'Manual edit' } };
    await act(async () => resolve({ ok: true, json: async () => ({ draft: fixture(), reply: 'Done', changed: true }) }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Your edits are safe');
    expect(screen.getByLabelText('Your answer')).toHaveValue('Rahul');
  });
  it('automatically submits a finished voice answer and stops capture on unmount', async () => {
    const recognition: BrowserRecognition = { lang: '', continuous: false, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Try again' }) });
    const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create: () => recognition }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    act(() => { recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'For Rahul' } }] }); recognition.onend?.(); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Try again'));
    fireEvent.click(screen.getByRole('button', { name: 'Speak' })); view.unmount();
    expect(recognition.abort).toHaveBeenCalled(); expect(recognition.onresult).toBeNull();
  });
  it('ignores canceled playback callbacks rather than reopening the microphone', () => {
    const previousSynthesis = window.speechSynthesis;
    const previousUtterance = window.SpeechSynthesisUtterance;
    const utterances: { onend?: () => void; onerror?: () => void }[] = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: jest.fn(), speak: jest.fn(utterance => utterances.push(utterance)) } });
    window.SpeechSynthesisUtterance = class { lang = ''; constructor(public text: string) {} } as unknown as typeof SpeechSynthesisUtterance;
    const create = jest.fn();
    const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    expect(utterances).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pause voice conversation' }));
    act(() => { utterances[0].onend?.(); utterances[0].onerror?.(); });
    expect(create).not.toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull();
    view.unmount();
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: previousSynthesis });
    window.SpeechSynthesisUtterance = previousUtterance;
  });
});
