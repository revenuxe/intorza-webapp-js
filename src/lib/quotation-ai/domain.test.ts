import { applyOperations, draftSchema, fromQuotation, itemCalculation, quotationTotals, reviewDraft, toQuotation, type VoiceDraft } from './domain';

export const fixture = (): VoiceDraft => ({ version: 1, revision: 0,
  project: { projectTitle: 'Bedroom', clientName: 'Rahul', clientAddress: '', placeOfProject: '', projectType: '' },
  pricing: { gstEnabled: true, gstRate: 18, discountPercentage: 5, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 },
  sections: [{ id: 'room', title: 'Bedroom', items: [{ id: 'wardrobe', productName: 'Wardrobe', productDetails: '', side: 'A', measurementMode: 'dimensions', widthFt: 8, heightFt: 7, sftArea: null, ratePerSft: 1200 }] }],
});
describe('voice quotation domain', () => {
  it('calculates exact reviewed totals and matches the existing form adapter', () => {
    const draft = fixture();
    expect(reviewDraft(draft)).toEqual({ missing: [], subtotal: 67200, discount: 3360, tax: 11491.2, total: 75331.2 });
    const sections = toQuotation(draft);
    expect(sections[0].items[0]).toMatchObject({ sftArea: 56, amount: 67200 });
    expect(quotationTotals(sections.flatMap(s => s.items.map(i => i.amount)), draft.pricing).total).toBe(reviewDraft(draft).total);
  });
  it('keeps incomplete values distinct from explicit free items', () => {
    const draft = fixture(); draft.sections[0].items[0].ratePerSft = null;
    expect(reviewDraft(draft).missing).toContain('Wardrobe: rate per square foot');
    expect(() => toQuotation(draft)).toThrow('Complete');
    draft.sections[0].items[0].ratePerSft = 0;
    expect(reviewDraft(draft).missing).toEqual([]);
    expect(reviewDraft(draft).total).toBe(0);
  });
  it('converts explicit feet/inches decimals and supports direct area without fake dimensions', () => {
    const draft = fixture(); draft.sections[0].items[0].widthFt = 6.5;
    expect(itemCalculation(draft.sections[0].items[0]).area).toBe(45.5);
    const next = applyOperations(draft, [{ type: 'update_item', itemId: 'wardrobe', fields: { measurementMode: 'direct_area', sftArea: 42 } }]);
    expect(next.sections[0].items[0]).toMatchObject({ widthFt: null, heightFt: null, sftArea: 42 });
    expect(toQuotation(next)[0].items[0]).toMatchObject({ widthFt: 0, heightFt: 0, sftArea: 42, amount: 50400 });
  });
  it('rounds to cents and preserves social discount precedence', () => {
    expect(quotationTotals([0.1, 0.2], fixture().pricing).subtotal).toBe(0.3);
    const draft = fixture(); draft.pricing.enableSocialMediaDiscount = true;
    expect(reviewDraft(draft).discount).toBe(4032);
  });
  it('rejects an entire batch when a reference is stale without mutating the original', () => {
    const draft = fixture();
    expect(() => applyOperations(draft, [{ type: 'update_project', fields: { clientName: 'Changed' } }, { type: 'update_item', itemId: 'unknown', fields: { ratePerSft: 20 } }])).toThrow('no longer exists');
    expect(draft.project.clientName).toBe('Rahul');
    expect(draft.revision).toBe(0);
  });
  it('rejects negative amounts, injected totals, unknown commands, and duplicate identifiers', () => {
    const draft = fixture();
    expect(() => applyOperations(draft, [{ type: 'update_item', itemId: 'wardrobe', fields: { ratePerSft: -1 } }])).toThrow();
    expect(draftSchema.safeParse({ ...draft, total: 1 }).success).toBe(false);
    expect(() => applyOperations(draft, [{ type: 'send_quote' } as never])).toThrow();
    expect(() => applyOperations(draft, [{ type: 'add_section', title: 'Other' }], () => 'room')).toThrow('duplicate');
  });
  it('preserves IDs and treats an overridden manual area as direct billing', () => {
    const draft = fixture(); const sections = toQuotation(draft);
    sections[0].items[0].sftArea = 40;
    const imported = fromQuotation(draft.project, sections, draft.pricing);
    expect(imported.sections[0].items[0]).toMatchObject({ id: 'wardrobe', measurementMode: 'direct_area', widthFt: null, heightFt: null, sftArea: 40 });
  });
  it('accepts legacy section and item IDs sharing a value but rejects conflicting measurement edits', () => {
    const draft = fixture(); draft.sections[0].id = 'wardrobe';
    expect(applyOperations(draft, []).sections).toHaveLength(1);
    expect(() => applyOperations(draft, [{ type: 'update_item', itemId: 'wardrobe', fields: { sftArea: 42 } }])).toThrow('Clarify');
  });
  it('projects partial dimensions into live fields without losing the width on re-import', () => {
    const draft = fixture(); draft.sections[0].items[0].heightFt = null; draft.sections[0].items[0].ratePerSft = null;
    const sections = toQuotation(draft, true);
    expect(sections[0].items[0]).toMatchObject({ widthFt: 8, heightFt: 0, sftArea: 0, amount: 0 });
    expect(fromQuotation(draft.project, sections, draft.pricing).sections[0].items[0]).toMatchObject({ measurementMode: 'dimensions', widthFt: 8, heightFt: null });
    expect(() => toQuotation(draft)).toThrow('Complete');
  });
});
