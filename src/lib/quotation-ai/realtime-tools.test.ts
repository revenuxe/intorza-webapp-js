/** @jest-environment node */
import { isFaithfulLanguageRepair, validateRealtimeChange } from './realtime-tools';
import type { VoiceDraft } from './domain';
const draft: VoiceDraft = { version: 1, revision: 0, project: { projectTitle: 'Home', clientName: 'Aslam', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'bedroom', title: 'Bedroom', items: [{ id: 'wardrobe', productName: 'Wardrobe', productDetails: '', side: '', measurementMode: 'dimensions', widthFt: 6, heightFt: 8, sftArea: null, ratePerSft: 1200 }] }] };
it('allows language repair without changing numeric facts, IDs or already-English text', () => {
  const original = { reply: 'Check kar lijiye', displayReply: 'नाम जाँचिए', transcript: 'मेरा नाम असलम है', clarification: null, operationsJson: JSON.stringify([{ type: 'update_item', itemId: 'wardrobe', fields: { productDetails: 'सफेद लैमिनेट', ratePerSft: 1200 } }]), focus: 'ratePerSft' };
  const repaired = { ...original, displayReply: 'Please check the details.', transcript: 'My name is Aslam.', operationsJson: JSON.stringify([{ type: 'update_item', itemId: 'wardrobe', fields: { productDetails: 'White laminate', ratePerSft: 1200 } }]) };
  expect(isFaithfulLanguageRepair(original, repaired)).toBe(true);
  expect(isFaithfulLanguageRepair(original, { ...repaired, operationsJson: repaired.operationsJson.replace('1200', '1500') })).toBe(false);
  expect(isFaithfulLanguageRepair(original, { ...repaired, operationsJson: repaired.operationsJson.replace('wardrobe', 'another-item') })).toBe(false);
  expect(isFaithfulLanguageRepair(repaired, { ...repaired, operationsJson: repaired.operationsJson.replace('White laminate', 'Black laminate') })).toBe(false);
});
it('permits an empty opening transcript only in explicit startup context without edits', () => {
  const opening = { reply: 'GST add karna hai?', displayReply: 'Should we add GST?', transcript: '', clarification: null, operationsJson: '[]', endConversation: false, focus: 'gstEnabled' };
  expect(validateRealtimeChange(draft, opening, { allowEmptyTranscript: true }).changed).toBe(false);
  expect(() => validateRealtimeChange(draft, opening)).toThrow('English transcript');
  expect(() => validateRealtimeChange(draft, { ...opening, operationsJson: JSON.stringify([{ type: 'update_project', fields: { clientName: 'Changed' } }]) }, { allowEmptyTranscript: true })).toThrow('English transcript');
});
it('normalizes only the redundant operations wrapper and rejects other object shapes safely', () => {
  const base = { reply: 'Quotation title kya rakhein?', displayReply: 'What is the quotation title?', transcript: 'My name is Rahul.', clarification: null, endConversation: false, focus: 'projectTitle' };
  const result = validateRealtimeChange(draft, { ...base, operationsJson: JSON.stringify({ operations: [{ type: 'update_project', fields: { clientName: 'Rahul' } }] }) });
  expect(result.draft.project.clientName).toBe('Rahul');
  expect(() => validateRealtimeChange(draft, { ...base, operationsJson: JSON.stringify({ unexpected: [] }) })).toThrow('invalid quotation update');
});
it('enforces the selected audio reply language while retaining English quotation text', () => {
  const base = { displayReply: 'What is the quotation title?', transcript: 'My name is Rahul.', clarification: null, operationsJson: '[]', endConversation: false, focus: 'projectTitle' };
  expect(() => validateRealtimeChange(draft, { ...base, reply: 'What is the quotation title?' }, { spokenLanguage: 'hi-IN-native' })).toThrow('not in Hindi');
  expect(() => validateRealtimeChange(draft, { ...base, reply: 'कोटेशन का नाम क्या रखें?' }, { spokenLanguage: 'hi-IN' })).toThrow('wrong language');
  expect(validateRealtimeChange(draft, { ...base, reply: 'Quotation ka title kya rakhein?' }, { spokenLanguage: 'hi-IN' }).changed).toBe(false);
});
it('keeps a completed item conversation open for tax, discounts and more items', () => {
  const result = validateRealtimeChange(draft, { reply: 'GST add karna hai?', displayReply: 'Should we add GST?', transcript: 'The wardrobe details are complete.', clarification: null, operationsJson: '[]', endConversation: false, focus: 'gstEnabled' });
  expect(result.complete).toBe(false); expect(result.focus).toBe('gstEnabled'); expect(result.review.missing).toEqual([]);
});
it('explains matlab without changing fields or advancing focus', () => {
  const result = validateRealtimeChange(draft, { reply: 'Rate matlab ek square foot ka price. Apna rate bata dijiye.', displayReply: 'Rate means the price for one square foot. Enter your rate.', transcript: 'What does rate mean?', clarification: 'Rate matlab ek square foot ka price. Apna rate bata dijiye.', operationsJson: JSON.stringify([{ type: 'update_item', itemId: 'wardrobe', fields: { ratePerSft: 999 } }]), endConversation: false, focus: 'ratePerSft' });
  expect(result.changed).toBe(false); expect(result.draft.sections[0].items[0].ratePerSft).toBe(1200); expect(result.focus).toBe('ratePerSft');
});
it('fills English product text and honors an explicit conversation end', () => {
  const result = validateRealtimeChange(draft, { reply: 'White laminate add kar diya.', displayReply: 'White laminate added.', transcript: 'Please enter white laminate and finish.', clarification: null, operationsJson: JSON.stringify([{ type: 'update_item', itemId: 'wardrobe', fields: { productDetails: 'White laminate' } }]), endConversation: true, focus: 'review' });
  expect(result.draft.sections[0].items[0].productDetails).toBe('White laminate'); expect(result.complete).toBe(true);
});
