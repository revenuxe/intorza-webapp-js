/** @jest-environment node */
import { decodePCM, encodePCM } from './live-audio';
describe('Gemini Live PCM transport', () => {
  it('encodes signed 16-bit little-endian PCM without clipping overflow', () => {
    const decoded = decodePCM(encodePCM(new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2])));
    expect(decoded[0]).toBe(0); expect(decoded[1]).toBeCloseTo(0.5, 4); expect(decoded[2]).toBe(-0.5);
    expect(decoded[3]).toBeCloseTo(1, 4); expect(decoded[4]).toBe(-1); expect(decoded[5]).toBeCloseTo(1, 4); expect(decoded[6]).toBe(-1);
  });
  it('resamples capture frames to 16kHz and rejects malformed output frames', () => {
    expect(decodePCM(encodePCM(new Float32Array(1024), 48000))).toHaveLength(341);
    expect(() => decodePCM(btoa('x'))).toThrow('Invalid audio');
  });
});
