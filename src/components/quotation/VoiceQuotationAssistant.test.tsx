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
  beforeEach(() => { localStorage.clear(); });
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
  it('aborts a pending OpenAI spoken question when paused without opening recognition', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const create = jest.fn();
    const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/quotation-ai/speech');
    fireEvent.click(screen.getByRole('button', { name: 'Pause voice conversation' }));
    expect(options.signal.aborted).toBe(true); expect(create).not.toHaveBeenCalled(); view.unmount();
  });
  it('switches the initial question and controls to Hindi and keeps the preference', () => {
    render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={unsupported} />);
    fireEvent.change(screen.getByLabelText('Speech language'), { target: { value: 'hi-IN' } });
    expect(screen.getByText('Who is this quotation for?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speak' })).toBeInTheDocument();
    expect(localStorage.getItem('quotation-voice-language')).toBe('hi-IN');
  });
  it('speaks Hindi through OpenAI while showing only English questions, then listens after playback', async () => {
    const previousAudio = global.Audio;
    let ended: (() => void) | null = null;
    const audio = { onended: null, onerror: null, play: jest.fn().mockResolvedValue(undefined), pause: jest.fn(), removeAttribute: jest.fn() };
    global.Audio = jest.fn(() => audio) as unknown as typeof Audio;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['mp3']) });
    const recognition: BrowserRecognition = { lang: '', continuous: true, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
    const create = jest.fn(() => recognition);
    const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create }} />);
    try {
      fireEvent.change(screen.getByLabelText('Speech language'), { target: { value: 'hi-IN' } });
      fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
      await waitFor(() => expect(audio.play).toHaveBeenCalled());
      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.language).toBe('hi-IN'); expect(payload.text).toContain('यह कोटेशन');
      expect(screen.getByText('Who is this quotation for?')).toBeInTheDocument();
      expect(create).not.toHaveBeenCalled(); ended = audio.onended;
      act(() => ended?.()); expect(create).toHaveBeenCalledWith('hi-IN');
      expect(recognition.start).toHaveBeenCalled();
    } finally { view.unmount(); global.Audio = previousAudio; }
  });
  it('requires review instead of automatically sending low-confidence speech', () => {
    const recognition: BrowserRecognition = { lang: '', continuous: false, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
    global.fetch = jest.fn();
    render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create: () => recognition }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    act(() => { recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'six six', confidence: 0.3 } }] }); recognition.onend?.(); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Your answer')).toHaveValue('six six');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the answer');
  });
  it('does not send filler-only utterances to Gemini', () => {
    const recognition: BrowserRecognition = { lang: '', continuous: true, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
    global.fetch = jest.fn();
    const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create: () => recognition }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    act(() => { recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'hmm um' } }] }); recognition.onend?.(); });
    expect(global.fetch).not.toHaveBeenCalled(); view.unmount();
  });
  it('waits for a settled final answer and cancels the endpoint timer when closed', () => {
    jest.useFakeTimers();
    try {
      const recognition: BrowserRecognition = { lang: '', continuous: true, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
      const view = render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create: () => recognition }} />);
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
      act(() => { recognition.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Eight feet' } }] }); jest.advanceTimersByTime(599); });
      expect(recognition.stop).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1)); expect(recognition.stop).toHaveBeenCalledTimes(1);
      view.unmount(); act(() => jest.advanceTimersByTime(20000)); expect(recognition.stop).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });
  it('lets users review high-confidence speech in noisy surroundings and avoids duplicated result events', () => {
    const recognition: BrowserRecognition = { lang: '', continuous: true, interimResults: true, onresult: null, onend: null, onerror: null, start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
    global.fetch = jest.fn();
    render(<VoiceQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} speechInput={{ available: () => true, create: () => recognition }} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Noisy surroundings/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    act(() => {
      const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'For Rahul', confidence: 0.95 } }] };
      recognition.onresult?.(event); recognition.onresult?.(event); recognition.onend?.();
    });
    expect(global.fetch).not.toHaveBeenCalled(); expect(screen.getByLabelText('Your answer')).toHaveValue('For Rahul');
  });
});
