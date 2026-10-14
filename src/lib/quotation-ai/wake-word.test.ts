import { isOrzaWakeCall } from './wake-word';
it('accepts a direct wake call in English or Hindi', () => {
  for (const text of ['Orza', 'Hey Orza', 'orza resume', 'ओरजा', 'हेलो ओरज़ा', 'ORZA!']) expect(isOrzaWakeCall(text)).toBe(true);
});
it('ignores incidental mentions and unrelated background words', () => {
  for (const text of ['', 'hmm', 'go ahead', 'I told Orza yesterday', 'what does Orza mean', 'order']) expect(isOrzaWakeCall(text)).toBe(false);
});
