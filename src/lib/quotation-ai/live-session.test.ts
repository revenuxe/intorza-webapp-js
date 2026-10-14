import { GeminiLiveSession } from './live-session';
import { LiveAudio } from './live-audio';
jest.mock('./live-audio', () => ({ LiveAudio: jest.fn().mockImplementation(() => ({ start: jest.fn(), play: jest.fn(), interrupt: jest.fn(), stop: jest.fn() })) }));
class Socket {
  static OPEN = 1; readyState = 1; bufferedAmount = 0; binaryType = '';
  onopen: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null; onclose: (() => void) | null = null;
  send = jest.fn(); close = jest.fn(); constructor(public url: string) { sockets.push(this); }
}
const sockets: Socket[] = [];
const originalSocket = global.WebSocket;
beforeEach(() => { sockets.length = 0; jest.clearAllMocks(); global.WebSocket = Socket as unknown as typeof WebSocket; });
afterEach(() => { global.WebSocket = originalSocket; });
function callbacks() { return { onReady: jest.fn(), onInput: jest.fn(), onOutput: jest.fn(), onError: jest.fn(), onEnd: jest.fn(), onTool: jest.fn().mockResolvedValue({ ok: true }) }; }
function message(value: unknown) { sockets[0].onmessage?.({ data: JSON.stringify(value) }); }
describe('native Live session lifecycle', () => {
  it('sends setup first and gates conversation until setup completion', () => {
    const events = callbacks(); const session = new GeminiLiveSession(events);
    session.connect('auth_tokens/short', { model: 'models/gemini-3.8-live' }, new Date(Date.now() + 10000).toISOString());
    session.text('Early'); expect(sockets[0].send).not.toHaveBeenCalled();
    sockets[0].onopen?.(); expect(JSON.parse(sockets[0].send.mock.calls[0][0])).toHaveProperty('setup');
    message({ setupComplete: {} }); expect(events.onReady).toHaveBeenCalled();
    expect(sockets[0].url).toContain('access_token=auth_tokens%2Fshort');
    session.stop(); expect(sockets[0].close).toHaveBeenCalled();
  });
  it('deduplicates tool execution and suppresses canceled responses', async () => {
    const events = callbacks(); let resolve: (result: unknown) => void;
    events.onTool.mockImplementation(() => new Promise(done => { resolve = done; }));
    const session = new GeminiLiveSession(events); session.connect('auth_tokens/short', {}, new Date(Date.now() + 10000).toISOString());
    const call = { toolCall: { functionCalls: [{ id: 'call1', name: 'get_quotation' }] } };
    message(call); message(call); await Promise.resolve(); expect(events.onTool).toHaveBeenCalledTimes(1);
    message({ toolCallCancellation: { ids: ['call1'] } }); resolve({ ok: true }); await Promise.resolve(); await Promise.resolve();
    expect(sockets[0].send).not.toHaveBeenCalled(); session.stop();
  });
  it('flushes playback when interrupted and stops audio on disconnect', () => {
    const events = callbacks(); const session = new GeminiLiveSession(events); session.connect('auth_tokens/short', {}, new Date(Date.now() + 10000).toISOString());
    message({ serverContent: { interrupted: true } });
    const audio = (LiveAudio as jest.Mock).mock.results[0].value;
    expect(audio.interrupt).toHaveBeenCalled(); sockets[0].onclose?.();
    expect(audio.stop).toHaveBeenCalled(); expect(events.onEnd).toHaveBeenCalled();
  });
});
