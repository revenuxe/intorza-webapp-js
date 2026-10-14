export async function recordMetaVoiceTurn(): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  const context = new AudioContext(); const source = context.createMediaStreamSource(stream); const processor = context.createScriptProcessor(4096, 1, 1); const parts: Float32Array[] = [];
  let heard = false; let lastSpeech = Date.now(); let settled = false;
  return new Promise((resolve, reject) => {
    const finish = () => { if (settled) return; settled = true; clearTimeout(limit); processor.disconnect(); source.disconnect(); stream.getTracks().forEach(track => track.stop());
      const input = new Float32Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { input.set(part, offset); offset += part.length; }
      const rate = 16000; const pcm = new Int16Array(Math.max(1, Math.floor(input.length * rate / context.sampleRate))); for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[Math.min(input.length - 1, Math.floor(i * context.sampleRate / rate))] || 0)) * 0x7fff;
      const wav = new ArrayBuffer(44 + pcm.byteLength); const view = new DataView(wav); const write = (at: number, text: string) => [...text].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0))); write(0, 'RIFF'); view.setUint32(4, 36 + pcm.byteLength, true); write(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcm.byteLength, true); new Int16Array(wav, 44).set(pcm); void context.close(); heard ? resolve(new Blob([wav], { type: 'audio/wav' })) : reject(new Error('No speech was detected.')); };
    const limit = setTimeout(finish, 15000); processor.onaudioprocess = event => { const samples = new Float32Array(event.inputBuffer.getChannelData(0)); parts.push(samples); const level = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length); if (level > .018) { heard = true; lastSpeech = Date.now(); } if (heard && Date.now() - lastSpeech > 850) finish(); }; source.connect(processor); processor.connect(context.destination);
  });
}
