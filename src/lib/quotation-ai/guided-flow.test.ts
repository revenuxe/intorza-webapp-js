/** @jest-environment node */
import { advanceGuided, type GuidedState } from './guided-flow';
import { reviewDraft, type VoiceDraft } from './domain';
function fixture(): VoiceDraft { return { version: 1, revision: 0, project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] }; }
describe('guided quotation workflow', () => {
  it('completes multiple items with dimensions, direct area, tax and discount', () => {
    let state: GuidedState = { step: 'clientName' }; let draft = fixture(); let sequence = 0;
    const answers = ['Rahul', 'Home interiors', '', 'Delhi', 'Residential', 'new', 'Bedroom', 'Wardrobe', 'White laminate', '', 'dimensions', '6.5', '8', '100', 'yes', 'Wall panel', '', '', 'direct_area', '12.5', '80', 'no', 'no', 'yes', '18', 'standard', '10'];
    for (const answer of answers) { const next = advanceGuided(state, draft, answer, () => `id${++sequence}`); state = next.state; draft = next.draft; }
    expect(state.step).toBe('review'); expect(draft.sections).toHaveLength(1); expect(draft.sections[0].title).toBe('Bedroom'); expect(draft.sections[0].items).toHaveLength(2);
    expect(reviewDraft(draft)).toEqual({ missing: [], subtotal: 6200, discount: 620, tax: 1004.4, total: 6584.4 });
  });
  it('rejects non-English fields and invalid numbers without changing the draft', () => {
    const draft = fixture(); expect(() => advanceGuided({ step: 'clientName' }, draft, 'राहुल')).toThrow('English letters'); expect(draft.project.clientName).toBe('');
    for (const answer of ['-2', '0', 'NaN', '1e4']) expect(() => advanceGuided({ step: 'widthFt', itemId: 'missing' }, draft, answer)).toThrow();
    expect(() => advanceGuided({ step: 'gstRate' }, draft, '101')).toThrow('between 0 and 100');
  });
  it('does not proceed to pricing without an item, and repairs incomplete existing items', () => {
    expect(advanceGuided({ step: 'addSection' }, fixture(), 'no').state.step).toBe('sectionChoice');
    const draft = fixture(); draft.sections[0].items.push({ id: 'existing', productName: 'Wardrobe', productDetails: '', side: '', measurementMode: 'direct_area', widthFt: null, heightFt: null, sftArea: 20, ratePerSft: null });
    expect(advanceGuided({ step: 'addSection' }, draft, 'no').state).toEqual({ step: 'ratePerSft', sectionId: 'room', itemId: 'existing' });
    expect(advanceGuided({ step: 'ratePerSft', itemId: 'existing', sectionId: 'room' }, draft, '0').draft.sections[0].items[0].ratePerSft).toBe(0);
  });
  it('makes social and standard discount selection explicit', () => {
    const draft = fixture(); draft.pricing.enableSocialMediaDiscount = true;
    const standard = advanceGuided({ step: 'discountMode' }, draft, 'standard'); expect(standard.draft.pricing.enableSocialMediaDiscount).toBe(false); expect(standard.state.step).toBe('discountPercentage');
    const social = advanceGuided({ step: 'discountMode' }, draft, 'social'); expect(social.state.step).toBe('socialMediaDiscountRate');
  });
});
