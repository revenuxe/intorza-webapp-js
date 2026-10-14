import { timedVoiceRequest } from './audio-compat';
it('propagates cancellation using basic AbortController support', () => {
  const parent = new AbortController(); const request = timedVoiceRequest(parent.signal, 1000);
  expect(request.signal.aborted).toBe(false); parent.abort(); expect(request.signal.aborted).toBe(true); request.dispose();
});
it('times out and clears unused timeout work', () => {
  jest.useFakeTimers();
  try {
    const request = timedVoiceRequest(new AbortController().signal, 1000);
    jest.advanceTimersByTime(1000); expect(request.signal.aborted).toBe(true); request.dispose();
    const finished = timedVoiceRequest(new AbortController().signal, 1000); finished.dispose();
    jest.advanceTimersByTime(2000); expect(finished.signal.aborted).toBe(false);
  } finally { jest.useRealTimers(); }
});
