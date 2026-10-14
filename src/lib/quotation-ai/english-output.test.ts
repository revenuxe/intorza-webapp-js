import { isEnglishScript, hasNonEnglishDraft } from './english-output';
import { applyOperations, type VoiceDraft } from './domain';
it('rejects non-Latin letters but permits currency, measurements and Roman names', () => {
  expect(isEnglishScript('Wardrobe: ₹1,200/sq ft, 6 × 7')).toBe(true);
  expect(isEnglishScript('अलमारी')).toBe(false);
});
it('translates existing section names without changing identifiers or numeric fields', () => {
  const draft = { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: 'बेडरूम', items: [] }] } as VoiceDraft;
  expect(hasNonEnglishDraft(draft)).toBe(true);
  const next = applyOperations(draft, [{ type: 'update_section', sectionId: 'room', title: 'Bedroom' }]);
  expect(next.sections[0].id).toBe('room'); expect(next.pricing).toEqual(draft.pricing); expect(hasNonEnglishDraft(next)).toBe(false);
});
