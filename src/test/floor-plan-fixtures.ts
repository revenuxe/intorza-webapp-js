import type { VoiceDraft } from '@/lib/quotation-ai/domain';
import type { PlanAnalysis, ProjectBrief } from '@/lib/quotation-ai/floor-plan';
export const planFixture = (): PlanAnalysis => ({ propertyType: 'Apartment', floors: 1, units: 'Feet', scale: 'Unknown', warnings: [], rooms: [
  { name: 'Bedroom', kind: 'bedroom', floor: '1', widthFt: 12, lengthFt: 10, source: 'printed', confidence: 'high', file: 'plan.pdf', page: 1, notes: '' },
] });
export const briefFixture = (): ProjectBrief => ({ scope: 'complete', roomNames: ['Bedroom'], finish: 'Standard', budget: null, clientName: 'Rahul', location: 'Bengaluru', address: '' });
export const draftFixture = (): VoiceDraft => ({ version: 1, revision: 0,
  project: { projectTitle: '', clientName: '', clientAddress: '', placeOfProject: '', projectType: '' },
  pricing: { gstEnabled: true, gstRate: 18, discountPercentage: 5, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [],
});
export const proposalFixture = () => ({ sections: [{ title: 'Bedroom', roomName: 'Bedroom', items: [{ productName: 'Wardrobe', description: 'Proposed wardrobe', rateId: 'rate', quantity: 56, measurementStatus: 'estimated', measurementReason: 'User provided work area' }] }], assumptions: [] });
