import type { VoiceDraft } from './domain';
const labels: Record<string, string> = { clientName: 'Customer name', projectTitle: 'Quotation title', clientAddress: 'Address', placeOfProject: 'Project location', projectType: 'Project type', productName: 'Product', productDetails: 'Details', side: 'Position', measurementMode: 'Measurement', widthFt: 'Width (ft)', heightFt: 'Height (ft)', sftArea: 'Area (sq ft)', ratePerSft: 'Rate per sq ft', gstEnabled: 'GST enabled', gstRate: 'GST (%)', discountPercentage: 'Discount (%)', enableSocialMediaDiscount: 'Social discount enabled', socialMediaDiscountRate: 'Social discount (%)' };
export type FieldReview = { label: string; value: string };
export function changedFields(before: VoiceDraft, after: VoiceDraft): FieldReview[] {
  const changes: FieldReview[] = [];
  function compare(old: Record<string, unknown>, next: Record<string, unknown>, prefix = '') {
    for (const [key, value] of Object.entries(next)) {
      if (!labels[key] || old[key] === value || ((value == null || value === '') && (old[key] == null || old[key] === ''))) continue;
      changes.push({ label: prefix + labels[key], value: value == null || value === '' ? 'Cleared' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value === 'dimensions' ? 'Width × height' : value === 'direct_area' ? 'Direct area' : String(value) });
    }
  }
  compare(before.project, after.project); compare(before.pricing, after.pricing);
  for (const section of after.sections) {
    const old = before.sections.find(value => value.id === section.id);
    if (section.title !== old?.title && (section.title || old?.title)) changes.push({ label: 'Section', value: section.title || 'Cleared' });
    for (const item of section.items) compare(old?.items.find(value => value.id === item.id) || {}, item, `${section.title || 'Item'} · `);
    for (const item of old?.items || []) if (!section.items.some(value => value.id === item.id)) changes.push({ label: 'Removed item', value: item.productName || 'Untitled' });
  }
  return changes;
}
