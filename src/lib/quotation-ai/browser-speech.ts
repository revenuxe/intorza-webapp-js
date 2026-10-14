export interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
export interface BrowserRecognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export interface SpeechInputProvider {
  available(): boolean;
  create(language: string): BrowserRecognition;
}
function constructor() {
  if (typeof window === 'undefined') return undefined;
  const browser = window as unknown as { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
}
export const browserSpeechInput: SpeechInputProvider = {
  available: () => Boolean(constructor()),
  create(language) {
    const Recognition = constructor();
    if (!Recognition) throw new Error('Voice recognition is unavailable in this browser. You can type your answers.');
    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    return recognition;
  },
};
