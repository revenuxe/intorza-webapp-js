/** @jest-environment node */
import { automaticWorkFaceAllowance, buildEstimate, completeEstimate, estimateCompletionSchema, mergeRoomEstimates, detectPlanType, scopedRooms, MAX_PLAN_BYTES, type PlanAnalysis, type PriceEvidence, type ProjectBrief } from './floor-plan';
import { draftFixture as fixture } from '@/test/floor-plan-fixtures';
import { itemCalculation, toQuotation } from './domain';

export const plan: PlanAnalysis = { propertyType: 'Apartment', floors: 1, units: 'Feet', scale: 'Unknown', warnings: [], rooms: [
  { name: 'Bedroom', kind: 'bedroom', floor: '1', widthFt: 12, lengthFt: 10, source: 'printed', confidence: 'high', file: 'plan.pdf', page: 1, notes: '' },
  { name: 'Kitchen', kind: 'kitchen', floor: '1', widthFt: null, lengthFt: null, source: 'unknown', confidence: 'low', file: 'plan.pdf', page: 1, notes: '' },
] };
export const brief: ProjectBrief = { scope: 'complete', roomNames: ['Bedroom', 'Kitchen'], finish: 'Standard', budget: null, clientName: 'Rahul', location: 'Bengaluru', address: '' };
const rate: PriceEvidence = { id: 'rate', name: 'Wardrobe', description: 'Approved specification', rate: 1200, unit: 'sqft', source: 'approved', location: 'Bengaluru', verifiedAt: '2026-10-15', currency: 'INR', sourceUrl: null, inclusions: 'Installation included' };
export const proposal = () => ({ sections: [{ title: 'Bedroom', roomName: 'Bedroom', items: [{ productName: 'Wardrobe', description: 'Proposed wardrobe', rateId: 'rate', quantity: 56, measurementStatus: 'estimated', measurementReason: 'User provided work area' }] }], assumptions: [] });
describe('floor plan quotation boundary', () => {
  it('calculates reproducible painting work from plan perimeter and labels assumed height and openings', () => {
    const raw = proposal(); raw.sections[0].items[0].productName = 'Wall painting';
    const painting = { ...rate, name: 'Wall painting', rate: 25 };
    const result = buildEstimate(raw, plan, { ...brief, automatic: true }, [painting], fixture());
    const item = toQuotation(result.draft, true)[0].items[0];
    expect(item).toMatchObject({ widthFt: 44, heightFt: 10, sftArea: 440, ratePerSft: 25, amount: 11000 });
    expect(result.evidence[0].reason).toContain('assumed 10 ft');
    expect(result.evidence[0].reason).toContain('No door/window deductions');
  });
  it('preserves multi-sentence product specifications for editor and PDF', () => {
    const raw = proposal(); raw.sections[0].items[0].description = '18mm BWP plywood. 1mm laminate finish. Soft-close hinges.';
    const result = buildEstimate(raw, plan, brief, [rate], fixture());
    expect(toQuotation(result.draft, true)[0].items[0].productDetails).toContain(raw.sections[0].items[0].description);
  });
  it('rejects disguised, empty and oversized files', () => {
    expect(() => detectPlanType(new TextEncoder().encode('<script>not an image</script>'))).toThrow('Invalid file');
    expect(() => detectPlanType(new Uint8Array())).toThrow();
    expect(() => detectPlanType(new Uint8Array(MAX_PLAN_BYTES + 1))).toThrow();
    expect(detectPlanType(new TextEncoder().encode('%PDF-1.7\ncontent\n%%EOF'))).toBe('application/pdf');
    expect(() => detectPlanType(new TextEncoder().encode('%PDF-1.7 /Encrypt\n%%EOF'))).toThrow('unlocked');
  });
  it('calculates totals using server rates and existing discount/GST rules', () => {
    const base = fixture(); const snapshot = JSON.stringify(base);
    const estimate = buildEstimate(proposal(), plan, brief, [rate], base);
    expect(estimate.totals).toEqual({ subtotal: 67200, discount: 3360, tax: 11491.2, total: 75331.2 });
    expect(estimate.draft.sections[0].items[0].productDetails).toContain('Proposed wardrobe');
    expect(estimate.draft.sections[0].items[0].productDetails).toContain('Approved specification');
    expect(JSON.stringify(base)).toBe(snapshot);
  });
  it('keeps unknown quantities and missing, mismatched or non-sqft rates pending', () => {
    const raw = proposal(); raw.sections[0].items[0].measurementStatus = 'unknown';
    const estimate = buildEstimate(raw, plan, brief, [{ ...rate, unit: 'piece' }], fixture());
    expect(estimate.draft.sections[0].items[0]).toMatchObject({ sftArea: null, ratePerSft: null });
    expect(estimate.incomplete).toBe(true); expect(estimate.totals.total).toBe(0);
    const mismatch = buildEstimate(proposal(), plan, brief, [{ ...rate, name: 'Painting' }], fixture());
    expect(mismatch.draft.sections[0].items[0].ratePerSft).toBeNull();
  });
  it('rejects items outside scope, duplicate billing and invalid numeric values', () => {
    expect(() => buildEstimate(proposal(), plan, { ...brief, roomNames: ['Kitchen'] }, [rate], fixture())).toThrow('outside');
    const raw = proposal(); raw.sections.push(raw.sections[0]);
    expect(() => buildEstimate(raw, plan, brief, [rate], fixture())).toThrow('duplicate');
    const invalid = proposal(); invalid.sections[0].items[0].quantity = -2;
    expect(() => buildEstimate(invalid, plan, brief, [rate], fixture())).toThrow();
  });
  it('uses detected room types for contextual scope', () => {
    expect(scopedRooms(plan, { scope: 'living-bedrooms', roomNames: brief.roomNames }).map(room => room.name)).toEqual(['Bedroom']);
  });
  it('reports selected rooms missing from a proposal rather than silently treating scope as complete', () => {
    const result = buildEstimate(proposal(), plan, brief, [], fixture());
    expect(result.scopeGaps).toEqual(['Kitchen']);
    expect(result.draft.sections).toHaveLength(1);
  });
  it('completes missing measurements and an explicit rate with exact server totals and stable IDs', () => {
    const raw = proposal(); raw.sections[0].items[0].measurementStatus = 'unknown';
    const previous = buildEstimate(raw, plan, brief, [], fixture());
    const itemId = previous.draft.sections[0].items[0].id;
    const completed = completeEstimate(previous, [{ itemId, widthFt: 8, heightFt: 7, ratePerSft: 1200 }]);
    expect(completed.totals.total).toBe(75331.2); expect(completed.incomplete).toBe(false);
    expect(completed.evidence[0].price.source).toBe('manual'); expect(completed.evidence[0].quantityStatus).toBe('user_entered');
    expect(completed.draft.sections[0].items[0].id).toBe(itemId);
    expect(completed.draft.sections[0].items[0]).toMatchObject({ measurementMode: 'dimensions', widthFt: 8, heightFt: 7, sftArea: null });
    expect(toQuotation(completed.draft, true)[0].items[0]).toMatchObject({ widthFt: 8, heightFt: 7, sftArea: 56, ratePerSft: 1200, amount: 67200 });
    expect(previous.draft.sections[0].items[0].ratePerSft).toBeNull();
    expect(() => completeEstimate(previous, [{ itemId: crypto.randomUUID(), widthFt: 8, heightFt: 7, ratePerSft: null }])).toThrow('no longer');
    expect(estimateCompletionSchema.safeParse({ action: 'complete', projectId: crypto.randomUUID(), changes: [{ itemId, widthFt: -1, heightFt: 7, ratePerSft: 1000 }] }).success).toBe(false);
  });
  it('preserves reviewed work dimensions when generating editor and PDF rows', () => {
    const result = buildEstimate(proposal(), plan, { ...brief, roomWork: [{ roomName: 'Bedroom', notes: '', items: [
      { key: 'wardrobe', widthFt: 8, heightFt: 7, areaSqft: null, details: '' },
    ] }] }, [rate], fixture());
    expect(result.draft.sections[0].items[0]).toMatchObject({ measurementMode: 'dimensions', widthFt: 8, heightFt: 7, sftArea: null });
    expect(toQuotation(result.draft, true)[0].items[0]).toMatchObject({ widthFt: 8, heightFt: 7, sftArea: 56, amount: 67200 });
  });
  it('derives a reviewable ceiling allowance from room dimensions without using that area for wardrobes', () => {
    const raw = proposal(); raw.sections[0].items[0].productName = 'False ceiling'; raw.sections[0].items[0].measurementStatus = 'unknown';
    const estimate = buildEstimate(raw, plan, brief, [], fixture());
    expect(estimate.draft.sections[0].items[0].sftArea).toBe(120);
    expect(estimate.evidence[0].reason).toContain('12 ft × 10 ft');
    const wardrobe = proposal(); wardrobe.sections[0].items[0].measurementStatus = 'unknown';
    expect(buildEstimate(wardrobe, plan, brief, [], fixture()).draft.sections[0].items[0].sftArea).toBeNull();
  });
  it('creates bounded work-face allowances for fast upload and replaces an implausible model wardrobe area', () => {
    const automatic = { ...brief, automatic: true };
    expect(automaticWorkFaceAllowance(plan.rooms[0], 'Wardrobe')).toMatchObject({ area: 56 });
    const raw = proposal();
    Object.assign(raw.sections[0].items[0], { quantity: 300, measurementStatus: 'estimated' });
    const result = buildEstimate(raw, plan, automatic, [rate], fixture());
    expect(result.draft.sections[0].items[0]).toMatchObject({ measurementMode: 'dimensions', widthFt: 8, heightFt: 7, sftArea: null, ratePerSft: 1200 });
    expect(result.evidence[0]).toMatchObject({ quantityStatus: 'estimated' });
    expect(result.evidence[0].reason).toContain('AI-estimated wardrobe work face');
  });
  it('keeps a plausible automatic model work-face estimate when it is within the room-based range', () => {
    const automatic = { ...brief, automatic: true };
    const raw = proposal(); Object.assign(raw.sections[0].items[0], { quantity: 56, measurementStatus: 'estimated' });
    const result = buildEstimate(raw, plan, automatic, [rate], fixture());
    expect(itemCalculation(result.draft.sections[0].items[0]).area).toBe(56);
    expect(result.evidence[0].reason).toContain('AI-estimated wardrobe work face');
  });
  it('regenerates selected rooms while preserving other room edits and refreshing their rates', () => {
    const raw = proposal();
    raw.sections.push({ title: 'Kitchen', roomName: 'Kitchen', items: [{ ...raw.sections[0].items[0], productName: 'Kitchen cabinet', rateId: null }] });
    const previous = buildEstimate(raw, plan, brief, [rate], fixture());
    previous.draft.sections[1].title = 'My kitchen title';
    const next = buildEstimate(proposal(), plan, brief, [{ ...rate, rate: 1500 }], fixture());
    const merged = mergeRoomEstimates(previous, next, ['Bedroom'], [{ ...rate, rate: 1500 }]);
    expect(merged.draft.sections).toHaveLength(2);
    expect(merged.draft.sections[0].title).toBe('My kitchen title');
    expect(merged.draft.sections[1].items[0].ratePerSft).toBe(1500);
    expect(merged.evidence).toHaveLength(2);
  });
});
