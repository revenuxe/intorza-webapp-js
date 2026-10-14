import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RealtimeQuotationAssistant } from './RealtimeQuotationAssistant';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
import { StrictMode } from 'react';
import type { BrowserRecognition } from '@/lib/quotation-ai/browser-speech';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }), onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) } } }));
const events = { readyState: 'open', send: jest.fn(), close: jest.fn(), onopen: null as null | (() => void), onmessage: null as null | ((event: { data: string }) => void), onclose: null };
const trackStop = jest.fn(); const close = jest.fn();
function fixture(): VoiceDraft { return { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] }; }
beforeEach(() => {
  localStorage.clear(); jest.clearAllMocks(); events.onmessage = null; events.onopen = null;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }) } });
  Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: jest.fn(() => ({ addTrack: jest.fn(), close, createDataChannel: () => events, createOffer: async () => ({ sdp: 'offer' }), setLocalDescription: async () => {}, setRemoteDescription: async () => {} })) });
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  global.fetch = jest.fn().mockImplementation(async (url: string) => url.includes('realtime/calls') ? { ok: true, text: async () => 'answer' } : { ok: true, json: async () => ({ value: 'ephemeral' }) });
});
afterEach(() => jest.restoreAllMocks());
async function start() {
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); act(() => events.onopen?.());
}
function event(value: unknown) { act(() => events.onmessage?.({ data: JSON.stringify(value) })); }
function tool(endConversation = false) { return { type: 'response.done', response: { status: 'completed', output: [{ type: 'function_call', name: 'update_quotation', call_id: 'call1', arguments: JSON.stringify({ reply: 'What is the quotation title?', displayReply: 'What is the quotation title?', transcript: 'For Rahul', clarification: null, endConversation, operationsJson: JSON.stringify([{ type: 'update_project', fields: { clientName: 'Rahul' } }]) }) }] } }; }
describe('Realtime quotation lifecycle', () => {
  it('opens just one microphone session under Strict Mode', async () => {
    render(<StrictMode><RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} /></StrictMode>);
    await start(); expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });
  it('recovers blocked mobile audio with a tap and replays without reconnecting', async () => {
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' })).mockResolvedValue(undefined);
    const track = { stop: trackStop, enabled: true };
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce({ getTracks: () => [track] });
    render(<RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} />);
    await start();
    const peer = (window.RTCPeerConnection as unknown as jest.Mock).mock.results[0].value;
    await act(async () => peer.ontrack({ streams: [{}] }));
    expect(track.enabled).toBe(false); expect(close).not.toHaveBeenCalled();
    event({ type: 'response.done', response: { status: 'completed', output: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable voice' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Enable voice' })).toBeNull());
    expect(play).toHaveBeenCalledTimes(2); expect(track.enabled).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2); expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(events.send.mock.calls.map(([value]) => JSON.parse(value))).toContainEqual(expect.objectContaining({ type: 'response.create', response: expect.objectContaining({ tool_choice: 'none' }) }));
  });
  it('offers a retry when microphone permission is denied without exposing provider options', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('Denied'), { name: 'NotAllowedError' }));
    render(<RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Allow microphone access'); expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
    expect(screen.queryByText('Options')).toBeNull(); expect(screen.queryByText(/OpenAI/)).toBeNull();
  });
  it('updates fields locally without another request and deduplicates calls', async () => {
    let current = fixture(); const onChange = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
    render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} />);
    await start(); event(tool()); expect(onChange).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('You: For Rahul')).toBeInTheDocument();
    event(tool()); expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close voice assistant' })); expect(trackStop).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
  });
  it('requests microphone permission automatically and has no separate explanation buttons', async () => {
    render(<RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} />);
    await start(); expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Explain simply' })).toBeNull();
    expect(screen.getByLabelText('Customer name')).toBeInTheDocument();
    expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body).language).toBe('hi-IN');
  });
  it('updates a typed field immediately and sends its new context to the conversation', async () => {
    let current = fixture(); const onChange = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
    render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} />);
    await start(); event({ type: 'response.done', response: { status: 'completed', output: [] } });
    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Aslam' } }); fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(current.project.clientName).toBe('Aslam'); expect(fetch).toHaveBeenCalledTimes(2); expect(screen.getByLabelText('Quotation title')).toBeInTheDocument();
  });
  it('preserves manual edits before a voice update', async () => {
    let current = fixture(); const onChange = jest.fn();
    render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} />);
    await start(); current = { ...current, project: { ...current.project, clientName: 'Manual' } }; event(tool());
    expect(onChange).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('edited manually'); expect(trackStop).toHaveBeenCalled();
  });
  it('ends capture immediately on finish and closes after final playback', async () => {
    let current = fixture();
    render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={draft => { current = draft; return JSON.stringify(draft); }} onClose={jest.fn()} />);
    await start(); event(tool(true)); expect(trackStop).toHaveBeenCalled();
    event({ type: 'output_audio_buffer.stopped' }); expect(close).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });
  it('waits for audio commit before requesting the next answer', async () => {
    render(<RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} />);
    await start(); event({ type: 'response.done', response: { status: 'completed', output: [] } }); events.send.mockClear();
    event({ type: 'input_audio_buffer.speech_stopped' }); expect(events.send).not.toHaveBeenCalled();
    event({ type: 'input_audio_buffer.committed' }); expect(events.send.mock.calls.map(([value]) => JSON.parse(value))).toContainEqual({ type: 'response.create' });
  });
  it('holds without a paid connection and resumes only for an Orza wake call', async () => {
    const wake: BrowserRecognition = { lang: '', continuous: true, interimResults: false, start: jest.fn(), stop: jest.fn(), abort: jest.fn(), onresult: null, onend: null, onerror: null };
    let current = fixture();
    const view = render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={draft => { current = draft; return JSON.stringify(draft); }} onClose={jest.fn()} speechInput={{ available: () => true, create: () => wake }} />);
    await start(); event(tool(true)); event({ type: 'output_audio_buffer.stopped' });
    expect(wake.start).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    act(() => wake.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'I told Orza yesterday' } }] }));
    expect(fetch).toHaveBeenCalledTimes(2);
    act(() => wake.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Orza' } }] }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4)); expect(wake.abort).toHaveBeenCalled();
    const session = JSON.parse((fetch as jest.Mock).mock.calls[2][1].body); expect(session.draft.project.clientName).toBe('Rahul');
    view.unmount(); expect(trackStop).toHaveBeenCalled();
  });
});
