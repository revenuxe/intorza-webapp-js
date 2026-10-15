import type { PriceEvidence } from './floor-plan';

export type ReferencePrice = {
  id: string; product_name: string; material: string; specification: string;
  location: string; currency: string; unit: string; tax: string; installation_included: boolean;
  section: string; project_type: string; price_date: string;
  source_count: number; median_rate: number; low_rate: number; high_rate: number;
  recent_source_count: number; recent_rate: number | null; recent_low: number | null; recent_high: number | null;
};
export const normalizeReferenceText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function referencePriceEvidence(rows: ReferencePrice[], currency: string, location: string): PriceEvidence[] {
  return rows.flatMap(row => {
    const rate = Number(row.recent_rate), low = Number(row.recent_low), high = Number(row.recent_high);
    if (row.currency !== currency || normalizeReferenceText(row.location) !== normalizeReferenceText(location)
      || row.unit !== 'sqft' || row.tax !== 'excluded' || !row.installation_included
      || !row.recent_source_count || !Number.isFinite(rate) || rate <= 0 || rate > 10000000
      || !Number.isFinite(low) || low <= 0 || !Number.isFinite(high) || high < low || high / low > 3) return [];
    return [{ id: row.id, name: row.product_name, description: `${row.material}. ${row.specification}`.slice(0, 1000),
      rate, unit: 'sqft', source: 'admin_reference' as const, currency, location: row.location,
      verifiedAt: row.price_date, sourceUrl: null, range: { low, high },
      confidence: row.recent_source_count >= 3 ? 'medium' as const : 'low' as const,
      inclusions: `Median of ${row.recent_source_count} comparable admin-reviewed quotations from the last 90 days. Range ${low}–${high} ${currency}/sqft. Installation included; GST excluded. Historical reference, not a live supplier quote.` }];
  });
}

/** Name alone is insufficient when the library has multiple material variants. */
export function matchingReferenceRate(rates: PriceEvidence[], name: string, specification: string) {
  const matches = rates.filter(row => ['approved','admin_reference'].includes(row.source)
    && normalizeReferenceText(row.name) === normalizeReferenceText(name));
  return matches.find(row => normalizeReferenceText(row.description) === normalizeReferenceText(specification))
    ?? (matches.length === 1 && matches[0].source === 'approved' ? matches[0] : undefined);
}
