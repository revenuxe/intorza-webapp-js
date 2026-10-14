import { reviewDraft, type VoiceDraft } from './domain';
export type VoiceLanguage = 'en-IN' | 'hi-IN';
export function normalizeSpokenDigits(text: string) {
  return text.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
}
export function initialQuestion(draft: VoiceDraft, language: VoiceLanguage) {
  const missing = reviewDraft(draft).missing;
  const hi = language === 'hi-IN';
  if (missing.includes('Client name')) return hi ? 'यह कोटेशन किसके लिए बनाना है?' : 'Who is this quotation for?';
  if (missing.includes('Quotation title')) return hi ? 'इस कोटेशन का नाम क्या रखें?' : 'What should we call this quotation?';
  if (missing.includes('At least one quotation item')) return hi ? 'कौन सा काम जोड़ना है? पहले आइटम के बारे में बताइए।' : 'What work should we include? Tell me the first item.';
  return missing.length ? hi ? 'आइटम का नाम, माप और प्रति वर्ग फुट कीमत में जो बाकी है, वह बताइए।' : `Please tell me ${missing[0].toLowerCase()}.` : hi ? 'कोटेशन भर गया है। कुछ जोड़ना या बदलना है?' : 'Your quotation is filled in. What would you like to add or change?';
}
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: VoiceLanguage) {
  return voices.find(voice => voice.lang.toLowerCase().replace('_', '-') === language.toLowerCase())
    || voices.find(voice => voice.lang.toLowerCase().startsWith(language.slice(0, 2)));
}
