// Conservative text filtering; this cannot identify the speaker or filter raw audio.
const tokens = (value: string) => value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').trim().split(/\s+/u).filter(Boolean);
const fillers = new Set(['hmm', 'hm', 'hmmm', 'umm', 'um', 'uh', 'uhh', 'ah', 'erm', 'er', 'हम्म', 'ह्म्म', 'अं', 'उम्म', 'हूँ', 'हूं']);
export function classifySpeechTurn(text: string, lastQuestion = ''): 'empty' | 'filler' | 'echo' | 'answer' {
  const words = tokens(text);
  if (!words.length) return 'empty';
  if (words.every(word => fillers.has(word))) return 'filler';
  const question = tokens(lastQuestion);
  if (question.length >= 4 && words.join(' ') === question.join(' ')) return 'echo';
  return 'answer';
}
export function thinkingConfigForModel(model: string): Record<string, unknown> {
  // Keep unknown/older model configuration intact instead of sending unsupported parameters.
  return /^gemini-3(?:\.|-).*flash/.test(model) ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {};
}
