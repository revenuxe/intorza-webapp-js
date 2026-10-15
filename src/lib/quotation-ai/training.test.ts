/** @jest-environment node */
import { trainingExtractionSchema, trainingReviewSchema } from './training';
export const extractionFixture = () => ({ location: 'Bengaluru', currency: 'INR', priceDate: '2026-10-01', projectType: 'Apartment', limitations: [], items: [{ section: 'Bedroom', productName: 'Wardrobe', material: 'Laminate', specification: 'Printed specification', unit: 'sqft', quantity: 56, rate: 1400, tax: 'excluded', installationIncluded: true, page: 2, notes: 'Installation included' }] });
describe('admin AI review validation', () => {
  it('requires explicit approval and a known city/date', () => {
    const base = { id: '00000000-0000-4000-8000-000000000001', action: 'approve', extraction: extractionFixture(), confirmAnonymized: true };
    expect(trainingReviewSchema.safeParse(base).success).toBe(true);
    expect(trainingReviewSchema.safeParse({ ...base, confirmAnonymized: false }).success).toBe(false);
    expect(trainingReviewSchema.safeParse({ ...base, extraction: { ...base.extraction, location: '' } }).success).toBe(false);
    expect(trainingReviewSchema.safeParse({ ...base, extraction: { ...base.extraction, priceDate: '2099-01-01' } }).success).toBe(false);
  });
  it('preserves uncertain prices as null and rejects invalid units, numeric values and extra private fields', () => {
    const input = extractionFixture(); input.items[0].rate = null;
    expect(trainingExtractionSchema.parse(input).items[0].rate).toBeNull();
    expect(trainingExtractionSchema.safeParse({ ...input, clientName: 'Private customer' }).success).toBe(false);
    for (const patch of [{ rate: -10 }, { rate: Infinity }, { unit: 'unknown' }, { page: 0 }]) expect(trainingExtractionSchema.safeParse({ ...input, items: [{ ...input.items[0], ...patch }] }).success).toBe(false);
  });
});
