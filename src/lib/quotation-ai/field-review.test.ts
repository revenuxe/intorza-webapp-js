import { changedFields } from './field-review';
import type { VoiceDraft } from './domain';
function draft(): VoiceDraft { return { version: 1, revision: 0, project: { clientName: '', projectTitle: '', clientAddress: '', placeOfProject: '', projectType: '' }, pricing: { gstEnabled: false, gstRate: 18, discountPercentage: 0, enableSocialMediaDiscount: false, socialMediaDiscountRate: 6 }, sections: [{ id: 'room', title: '', items: [] }] }; }
it('builds a factual review of customer, work, measurements and pricing changes', () => {
  const before = draft(); const after = draft(); after.project.clientName = 'Aslam'; after.sections[0].title = 'Bedroom'; after.pricing.gstEnabled = true;
  after.sections[0].items.push({ id: 'item', productName: 'Wardrobe', productDetails: 'White laminate', side: '', measurementMode: 'dimensions', widthFt: 6, heightFt: 8, sftArea: null, ratePerSft: 1200 });
  expect(changedFields(before, after)).toEqual(expect.arrayContaining([{ label: 'Customer name', value: 'Aslam' }, { label: 'GST enabled', value: 'Yes' }, { label: 'Section', value: 'Bedroom' }, { label: 'Bedroom · Width (ft)', value: '6' }, { label: 'Bedroom · Rate per sq ft', value: '1200' }]));
  expect(changedFields(before, after).some(entry => entry.value === 'null' || /(^| · )id$/.test(entry.label))).toBe(false);
});
it('does not invent changes for an unchanged quotation', () => {
  expect(changedFields(draft(), draft())).toEqual([]);
});
it('makes cleared values visible for checking', () => {
  const before = draft(); before.project.clientAddress = 'Delhi'; before.sections[0].title = 'Bedroom';
  expect(changedFields(before, draft())).toEqual(expect.arrayContaining([{ label: 'Address', value: 'Cleared' }, { label: 'Section', value: 'Cleared' }]));
});
