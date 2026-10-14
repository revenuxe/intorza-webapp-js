export function encodePCM(samples: Float32Array, sourceRate = 16000): string {
  const count = Math.floor(samples.length * 16000 / sourceRate);
  const bytes = new Uint8Array(count * 2); const view = new DataView(bytes.buffer);
  for (let i = 0; i < count; i++) {
    const at = i * sourceRate / 16000; const left = Math.floor(at); const fraction = at - left;
    const sample = Math.max(-1, Math.min(1, samples[left] * (1 - fraction) + (samples[Math.min(left + 1, samples.length - 1)] * fraction)));
    view.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodePCM(base64: string): Float32Array {
  const binary = atob(base64);
  if (binary.length % 2) throw new Error('Invalid audio frame.');
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0)); const view = new DataView(bytes.buffer);
  return Float32Array.from({ length: bytes.length / 2 }, (_, i) => view.getInt16(i * 2, true) / 32768);
}
export class LiveAudio {
  private capture?: AudioContext;
  private playback?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private muted?: GainNode;
  private sources = new Set<AudioBufferSourceNode>();
  private cursor = 0;
  private stopped = false;
  async start(onFrame: (data: string) => void) {
    // Resume audio directly from the user's click before awaiting network/permission.
    this.playback = new AudioContext({ sampleRate: 24000 });
    this.capture = new AudioContext({ sampleRate: 16000 });
    await Promise.all([this.playback.resume(), this.capture.resume()]);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    await this.capture.audioWorklet.addModule('/quotation-audio-worklet.js');
    if (this.stopped) return;
    this.source = this.capture.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(this.capture, 'quotation-capture');
    this.node.port.onmessage = event => { if (!this.stopped) onFrame(encodePCM(event.data, this.capture.sampleRate)); };
    this.muted = this.capture.createGain(); this.muted.gain.value = 0;
    this.source.connect(this.node); this.node.connect(this.muted); this.muted.connect(this.capture.destination);
  }
  play(data: string, sampleRate = 24000) {
    if (this.stopped || !this.playback || this.playback.state === 'closed') return;
    const samples = decodePCM(data);
    if (!samples.length) return;
    if (this.cursor - this.playback.currentTime > 15) throw new Error('Voice playback fell behind. Restart the conversation.');
    const buffer = this.playback.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = this.playback.createBufferSource(); source.buffer = buffer; source.connect(this.playback.destination);
    const start = Math.max(this.playback.currentTime, this.cursor);
    this.cursor = start + buffer.duration; this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    source.start(start);
  }
  interrupt() {
    for (const source of this.sources) { source.onended = null; try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    this.sources.clear(); this.cursor = this.playback?.currentTime ?? 0;
  }
  stop() {
    this.stopped = true;
    this.interrupt();
    if (this.node) this.node.port.onmessage = null;
    this.node?.disconnect(); this.source?.disconnect(); this.muted?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    void this.capture?.close().catch(() => {}); void this.playback?.close().catch(() => {});
  }
}
