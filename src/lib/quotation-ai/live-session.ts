import { LiveAudio } from './live-audio';

type FunctionCall = { id: string; name: string; args?: Record<string, unknown> };
type WireMessage = {
  error?: unknown; setupComplete?: unknown; goAway?: unknown;
  toolCallCancellation?: { ids?: string[] }; toolCall?: { functionCalls?: FunctionCall[] };
  serverContent?: { interrupted?: boolean; turnComplete?: boolean; inputTranscription?: { text?: string }; outputTranscription?: { text?: string }; modelTurn?: { parts?: { inlineData?: { data: string; mimeType: string } }[] } };
};
export type LiveCallbacks = {
  onReady(): void; onInput(text: string): void; onOutput(text: string): void;
  onError(message: string): void; onEnd(): void;
  onTurnComplete?(): void; onToolCancellation?(ids: string[]): void;
  onTool(call: FunctionCall, isCanceled: () => boolean): Promise<unknown>;
};
export class GeminiLiveSession {
  private socket?: WebSocket;
  private audio = new LiveAudio();
  private ready = false;
  private stopped = false;
  private cancelled = new Set<string>();
  private calls = new Map<string, Promise<unknown>>();
  private timeout?: ReturnType<typeof setTimeout>;
  private sessionLimit?: ReturnType<typeof setTimeout>;
  constructor(private callbacks: LiveCallbacks) {}
  async prepareAudio() {
    await this.audio.start(data => {
      if (!this.ready || this.stopped) return;
      if (this.socket.bufferedAmount > 262144) { this.fail('The connection is too slow for live audio. Try browser voice.'); return; }
      this.send({ realtimeInput: { audio: { data, mimeType: 'audio/pcm;rate=16000' } } });
    });
  }
  connect(token: string, setup: Record<string, unknown>, expiresAt: string) {
    if (this.stopped) return;
    if (!token.startsWith('auth_tokens/')) throw new Error('Invalid Live session token.');
    this.socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?access_token=${encodeURIComponent(token)}`);
    this.socket.binaryType = 'arraybuffer';
    this.timeout = setTimeout(() => this.fail('Live voice did not connect. Try browser voice.'), 15000);
    this.sessionLimit = setTimeout(() => { this.stop(); this.callbacks.onEnd(); }, Math.max(0, Math.min(Date.parse(expiresAt) - Date.now(), 180000)));
    this.socket.onopen = () => this.send({ setup });
    this.socket.onmessage = event => {
      if (this.stopped) return;
      try {
        const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
        this.receive(JSON.parse(text));
      } catch { this.fail('Live voice returned an unreadable message. Your quotation fields are safe.'); }
    };
    this.socket.onerror = () => this.fail('Live voice could not connect. Check Gemini Live access or use browser voice.');
    this.socket.onclose = () => { if (!this.stopped) { this.stop(); this.callbacks.onEnd(); } };
  }
  private send(message: unknown) { if (!this.stopped && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  private receive(message: WireMessage) {
    if (message.error) { this.fail('Gemini rejected the Live session configuration or model access. Try browser voice.'); return; }
    if (message.setupComplete) {
      clearTimeout(this.timeout); this.ready = true; this.callbacks.onReady();
      this.text('Read the current quotation with get_quotation, then ask the first missing-field question.');
    }
    for (const id of message.toolCallCancellation?.ids || []) this.cancelled.add(id);
    if (message.toolCallCancellation?.ids?.length) this.callbacks.onToolCancellation?.(message.toolCallCancellation.ids);
    if (message.serverContent?.interrupted) this.audio.interrupt();
    if (message.serverContent?.inputTranscription?.text) this.callbacks.onInput(message.serverContent.inputTranscription.text);
    if (message.serverContent?.outputTranscription?.text) this.callbacks.onOutput(message.serverContent.outputTranscription.text);
    for (const part of message.serverContent?.modelTurn?.parts || []) {
      if (part.inlineData?.data && /^audio\/pcm/.test(part.inlineData.mimeType)) {
        this.audio.play(part.inlineData.data, Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1]) || 24000);
      }
    }
    for (const call of message.toolCall?.functionCalls || []) {
      if (typeof call.id !== 'string' || typeof call.name !== 'string') continue;
      if (!this.calls.has(call.id)) {
        if (this.calls.size >= 100) { this.fail('Live session tool limit reached. Start a new conversation.'); return; }
        const isCanceled = () => this.stopped || this.cancelled.has(call.id);
        this.calls.set(call.id, Promise.resolve().then(() => isCanceled() ? { error: 'Canceled' } : this.callbacks.onTool(call, isCanceled)).catch(() => ({ error: 'The change failed. Read the quotation again and clarify.' })));
      }
      void this.calls.get(call.id).then(response => {
        if (!this.stopped && !this.cancelled.has(call.id)) this.send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] } });
      });
    }
    if (message.goAway) { this.fail('Live session is ending. Start again to continue from your current quotation.'); }
    if (message.serverContent?.turnComplete || message.serverContent?.interrupted) this.callbacks.onTurnComplete?.();
  }
  text(text: string) {
    if (!this.ready) return;
    this.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: text.slice(0, 3000) }] }], turnComplete: true } });
  }
  private fail(message: string) { if (this.stopped) return; this.stop(); this.callbacks.onError(message); }
  stop() {
    if (this.stopped) return;
    this.stopped = true; this.ready = false; clearTimeout(this.timeout); clearTimeout(this.sessionLimit); this.audio.stop();
    if (this.socket) { this.socket.onopen = null; this.socket.onmessage = null; this.socket.onerror = null; this.socket.onclose = null; this.socket.close(); }
  }
}
