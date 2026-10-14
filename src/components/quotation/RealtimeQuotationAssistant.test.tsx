import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RealtimeQuotationAssistant } from './RealtimeQuotationAssistant';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
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
  fireEvent.click(screen.getByRole('button', { name: 'Switch to live AI conversation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); act(() => events.onopen?.());
}
function event(value: unknown) { act(() => events.onmessage?.({ data: JSON.stringify(value) })); }
function tool(endConversation = false) { return { type: 'response.done', response: { status: 'completed', output: [{ type: 'function_call', name: 'update_quotation', call_id: 'call1', arguments: JSON.stringify({ reply: 'What is the quotation title?', displayReply: 'What is the quotation title?', transcript: 'For Rahul', clarification: null, endConversation, operationsJson: JSON.stringify([{ type: 'update_project', fields: { clientName: 'Rahul' } }]) }) }] } }; }
describe('Realtime quotation lifecycle', () => {
  it('updates fields locally without another request and deduplicates calls', async () => {
    let current = fixture(); const onChange = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
    render(<RealtimeQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} />);
    await start(); event(tool()); expect(onChange).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('You: For Rahul')).toBeInTheDocument();
    event(tool()); expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' })); expect(trackStop).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
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
    event({ type: 'output_audio_buffer.stopped' }); expect(close).toHaveBeenCalled(); expect(screen.getByText('Complete — review quotation')).toBeInTheDocument();
  });
  it('waits for audio commit before requesting the next answer', async () => {
    render(<RealtimeQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={jest.fn()} onClose={jest.fn()} />);
    await start(); event({ type: 'response.done', response: { status: 'completed', output: [] } }); events.send.mockClear();
    event({ type: 'input_audio_buffer.speech_stopped' }); expect(events.send).not.toHaveBeenCalled();
    event({ type: 'input_audio_buffer.committed' }); expect(events.send.mock.calls.map(([value]) => JSON.parse(value))).toContainEqual({ type: 'response.create' });
  });
});
