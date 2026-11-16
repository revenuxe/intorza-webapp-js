import type { QuotationSnapshot } from './quotationVersions';
export const tierPresets = ['Basic', 'Standard', 'Luxury'] as const;
export type QuotationTier = {
  id: string; tier_name: string | null; reference_no: string; status: string;
  grand_total: number; snapshot: QuotationSnapshot;
};
export type QuotationTierGroup = { root_id: string; tiers: QuotationTier[] };
export function tierQuotationTitle(title: string, tierName?: string | null) {
  return tierName ? `${title} — ${tierName}` : title;
}
export function tierComparisonRows(tiers: QuotationTier[]) {
  const rows = new Map<string, { label: string; values: (string | null)[] }>();
  tiers.forEach((tier, tierIndex) => {
    tier.snapshot.sections.forEach((section, sectionIndex) => {
      section.items.forEach((item, itemIndex) => {
        // Positions remain stable when copied tiers rename products or materials.
        const key = `${sectionIndex}:${itemIndex}`;
        const row = rows.get(key) || { label: `Room ${sectionIndex + 1} · Item ${itemIndex + 1}`, values: Array(tiers.length).fill(null) };
        row.values[tierIndex] = `${section.section_name} · ${item.product_name}`;
        rows.set(key, row);
      });
    });
  });
  return [...rows.entries()].map(([key, row]) => ({ key, ...row }));
}
