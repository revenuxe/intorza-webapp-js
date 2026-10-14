import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LiveQuotationAssistant } from './LiveQuotationAssistant';
import { GeminiLiveSession, type LiveCallbacks } from '@/lib/quotation-ai/live-session';
import type { VoiceDraft } from '@/lib/quotation-ai/domain';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'owner' } } } }),
  onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
} } }));
jest.mock('@/lib/quotation-ai/live-session', () => ({ GeminiLiveSession: jest.fn() }));
let events: LiveCallbacks; const stop = jest.fn();
function fixture(): VoiceDraft { return { version: 1, revision: 0, project: { clientName: '', projectTitle: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] }; }
beforeEach(() => {
  localStorage.clear(); jest.clearAllMocks();
  (GeminiLiveSession as jest.Mock).mockImplementation(callbacks => { events = callbacks; return { prepareAudio: jest.fn().mockResolvedValue(undefined), connect: jest.fn(), text: jest.fn(), stop }; });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'auth_tokens/test', setup: {}, expiresAt: new Date(Date.now() + 10000).toISOString() }) });
});
async function start() {
  fireEvent.click(screen.getByRole('button', { name: 'Start live voice' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  act(() => events.onReady());
}
const call = { id: 'edit', name: 'apply_quotation', args: { operationsJson: JSON.stringify([{ type: 'update_project', fields: { clientName: 'Rahul' } }]), expectedRevision: 0 } };
describe('Live quotation form tools', () => {
  it('populates fields only after the server validates a tool call', async () => {
    let current = fixture();
    const onChange = jest.fn((draft: VoiceDraft) => { current = draft; return JSON.stringify(draft); });
    const view = render(<LiveQuotationAssistant initialDraft={current} getCurrentDraft={() => current} onChange={onChange} onClose={jest.fn()} />);
    await start(); await act(async () => { await events.onTool({ id: 'read', name: 'get_quotation' }, () => false); });
    const next = fixture(); next.project.clientName = 'Rahul'; next.revision = 1;
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ draft: next }) });
    await act(async () => { await events.onTool(call, () => false); });
    expect(onChange).toHaveBeenCalledWith(next, JSON.stringify(fixture()));
    view.unmount(); expect(stop).toHaveBeenCalled();
  });
  it('does not apply a canceled tool even if validation finishes successfully', async () => {
    const onChange = jest.fn(); let canceled = false; let finish: (result: unknown) => void;
    render(<LiveQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={onChange} onClose={jest.fn()} />);
    await start(); await events.onTool({ id: 'read', name: 'get_quotation' }, () => false);
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let task: Promise<unknown>; act(() => { task = events.onTool(call, () => canceled); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2)); canceled = true;
    await act(async () => { finish({ ok: true, json: async () => ({ draft: fixture() }) }); await task; });
    expect(onChange).not.toHaveBeenCalled();
  });
  it('requires explicit acceptance of the proposed changes in noisy mode', async () => {
    const onChange = jest.fn(() => JSON.stringify(fixture()));
    render(<LiveQuotationAssistant initialDraft={fixture()} getCurrentDraft={fixture} onChange={onChange} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Noisy surroundings/ }));
    await start(); await events.onTool({ id: 'read', name: 'get_quotation' }, () => false);
    let task: Promise<unknown>; act(() => { task = events.onTool(call, () => false); });
    expect(screen.getByRole('list', { name: 'Proposed quotation changes' })).toHaveTextContent('Client: Rahul');
    expect(onChange).not.toHaveBeenCalled();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ draft: fixture() }) });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Accept change' })); await task; });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
