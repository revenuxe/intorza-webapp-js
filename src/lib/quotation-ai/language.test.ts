import { initialQuestion, normalizeSpokenDigits, selectSpeechVoice } from './language';
import type { VoiceDraft } from './domain';
describe('Hindi voice support', () => {
  it('normalizes Devanagari digits without changing names or amounts', () => {
    expect(normalizeSpokenDigits('राहुल: ६.५ फीट, १२०० रुपये, १८%')).toBe('राहुल: 6.5 फीट, 1200 रुपये, 18%');
  });
  it('uses native Hindi for the initial missing-client question', () => {
    const draft = { project: { clientName: '', projectTitle: '' }, sections: [], pricing: { gstEnabled: false, discountPercentage: 0, enableSocialMediaDiscount: false } } as VoiceDraft;
    expect(initialQuestion(draft, 'hi-IN')).toBe('यह कोटेशन किसके लिए बनाना है?');
  });
  it('selects the matching Hindi voice rather than the device English default', () => {
    const voices = [{ lang: 'en-US', name: 'Default' }, { lang: 'hi-IN', name: 'Hindi' }] as SpeechSynthesisVoice[];
    expect(selectSpeechVoice(voices, 'hi-IN')?.name).toBe('Hindi');
    expect(selectSpeechVoice(voices.slice(0, 1), 'hi-IN')).toBeUndefined();
  });
});
