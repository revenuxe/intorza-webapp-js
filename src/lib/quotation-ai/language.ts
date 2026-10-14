import { reviewDraft, type VoiceDraft } from './domain';
export type VoiceLanguage = 'en-IN' | 'hi-IN';
// Display-only transliteration. Send original speech to the model for semantic translation.
export function romanLetters(value: string): string {
  const consonants: Record<string, string> = { 'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'n','ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h','ळ':'l' };
  const vowels: Record<string, string> = { 'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऋ':'ri','ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au','ृ':'ri','ं':'n','ँ':'n','ः':'h','्':'','़':'','।':'.' };
  const chars = [...normalizeSpokenDigits(value)]; let result = '';
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (consonants[char]) {
      result += consonants[char];
      const next = chars[i + 1];
      if (next && consonants[next]) result += 'a';
    } else result += vowels[char] ?? char;
  }
  return result.replace(/[\u0900-\u097f]/g, '').replace(/\s+/g, ' ').trim();
}
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
