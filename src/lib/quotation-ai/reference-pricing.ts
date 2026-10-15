import type { PriceEvidence } from './floor-plan';

export type ReferencePrice = {
  id: string; product_name: string; material: string; specification: string;
  location: string; currency: string; unit: string; tax: string; installation_included: boolean;
  section: string; project_type: string; price_date: string;
  source_count: number; median_rate: number; low_rate: number; high_rate: number;
  recent_source_count: number; recent_rate: number | null; recent_low: number | null; recent_high: number | null;
};
export const normalizeReferenceText = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
export function referenceProduct(value: string) {
  const name = normalizeReferenceText(value);
  const aliases: Record<string, string> = {
    'base unit': 'kitchen base cabinets', 'base cabinet': 'kitchen base cabinets', 'base cabinets': 'kitchen base cabinets',
    'kitchen base unit': 'kitchen base cabinets', 'kitchen base units': 'kitchen base cabinets',
    'lower cabinet': 'kitchen base cabinets', 'lower cabinets': 'kitchen base cabinets', 'lower unit': 'kitchen base cabinets',
    'modular base': 'kitchen base cabinets', 'modular base cabinet': 'kitchen base cabinets',
    'wall unit': 'kitchen wall cabinets', 'wall cabinet': 'kitchen wall cabinets', 'wall cabinets': 'kitchen wall cabinets',
    'kitchen wall unit': 'kitchen wall cabinets', 'kitchen wall units': 'kitchen wall cabinets',
    'upper cabinet': 'kitchen wall cabinets', 'upper cabinets': 'kitchen wall cabinets', 'upper unit': 'kitchen wall cabinets',
    'overhead cabinet': 'kitchen wall cabinets', 'overhead cabinets': 'kitchen wall cabinets', 'overhead unit': 'kitchen wall cabinets',
    'tall unit': 'kitchen tall unit', 'tall cabinet': 'kitchen tall unit', 'tall cabinets': 'kitchen tall unit',
    'kitchen tall cabinet': 'kitchen tall unit', 'kitchen tall cabinets': 'kitchen tall unit',
    'pantry unit': 'kitchen tall unit', 'pantry cabinet': 'kitchen tall unit',
    'study unit': 'study storage', 'loft': 'loft storage',
  };
  return aliases[name] ?? name;
}
export const referenceCity = (value: string) => normalizeReferenceText(value).replace(/\bbangalore\b/g, 'bengaluru').replace(/\bbombay\b/g, 'mumbai').replace(/\bmadras\b/g, 'chennai');
export const unknownReferenceCity = (value: string) => !value.trim() || /^(unknown|not set|n\/a|none)$/i.test(value.trim());

export function referencePriceEvidence(rows: ReferencePrice[], currency: string, location: string, allowIndicative = false): PriceEvidence[] {
  return rows.flatMap(row => {
    const rate = Number(row.recent_rate), low = Number(row.recent_low), high = Number(row.recent_high);
    // Bundles in legacy PDFs were sometimes labelled sqft during extraction.
    // Never multiply a hardware/package total by a cabinet's work area.
    // Match names starting with OR containing these keywords (e.g. "kitchen accessories", "cabinet hardware").
    const productLabel = row.product_name.trim();
    if (/(?:^|\b)(accessories|hardware|appliances?|package|fittings|fitting|bundle)(?:\s|$)/i.test(productLabel)) return [];
    // Rates above 5000/sqft from reference PDFs are almost certainly lump-sum
    // package totals (₹20k-₹35k) that the extractor mis-labelled as sqft.
    if (Number(row.recent_rate) > 5000 && /(?:accessory|hardware|fitting|internal|basket|hinge|channel|shutter)/i.test(productLabel)) return [];
    if (row.currency !== currency || (!unknownReferenceCity(location) && referenceCity(row.location) !== referenceCity(location))
      || row.unit !== 'sqft' || (!allowIndicative && (row.tax !== 'excluded' || !row.installation_included))
      || !row.recent_source_count || !Number.isFinite(rate) || rate <= 0 || rate > 10000000
      || !Number.isFinite(low) || low <= 0 || !Number.isFinite(high) || high < low || high / low > 3) return [];
    const basisWarnings = [
      row.tax !== 'excluded' ? `Source tax treatment: ${row.tax}. The reference rate is reused unchanged; confirm tax before applying the quotation's GST to avoid double counting.` : '',
      !row.installation_included ? 'Installation is not confirmed by the source. No labour allowance has been invented; confirm inclusions.' : '',
      unknownReferenceCity(location) ? `Project city is unknown. This reference comes from ${row.location}; locality must be confirmed.` : '',
    ].filter(Boolean);
    return [{ id: row.id, name: row.product_name, description: `${row.material}. ${row.specification}`.slice(0, 1000),
      rate, unit: 'sqft', source: 'admin_reference' as const, currency, location: row.location,
      verifiedAt: row.price_date, sourceUrl: null, range: { low, high },
      confidence: !basisWarnings.length && row.recent_source_count >= 3 ? 'medium' as const : 'low' as const,
      basisWarnings,
      inclusions: `Median of ${row.recent_source_count} admin-reviewed quotations from the last 90 days. Range ${low}–${high} ${currency}/sqft. Tax ${row.tax}; installation ${row.installation_included ? 'included' : 'unconfirmed'}. Historical reference, not a live supplier quote.` }];
  });
}

/** Name alone is insufficient when the library has multiple material variants. */
export function matchingReferenceRate(rates: PriceEvidence[], name: string, specification: string) {
  const matches = rates.filter(row => ['approved','admin_reference'].includes(row.source)
    && referenceProduct(row.name) === referenceProduct(name));
  return matches.find(row => normalizeReferenceText(row.description) === normalizeReferenceText(specification))
    ?? (matches.length === 1 && matches[0].source === 'approved' && !conflicts(specification, matches[0].description) ? matches[0] : undefined);
}

const words = (value: string) => new Set(normalizeReferenceText(value)
  .replace(/\bcabinets?\b/g, 'cabinet').replace(/\bcupboards?\b/g, 'wardrobe')
  .replace(/\bunits?\b/g, 'unit').replace(/\bshelves\b/g, 'shelf')
  .split(/[^a-z0-9]+/).filter(word => (word.length > 2 || word === 'tv') && !['the','and','with','for','work','included','confirm','total','front','height','width','measure'].includes(word)));
const materials = ['plywood','mdf','hdf','particle','laminate','acrylic','veneer','solid wood','aluminium','steel','granite','quartz','marble','gypsum','pop','pvc'];
function conflicts(a: string, b: string) {
  const left = normalizeReferenceText(a), right = normalizeReferenceText(b);
  const leftMaterials = materials.filter(material => left.includes(material));
  const rightMaterials = materials.filter(material => right.includes(material));
  if (leftMaterials.length && rightMaterials.length && !leftMaterials.some(material => rightMaterials.includes(material))) return true;
  const groups = [materials.slice(0, 4), materials.slice(4, 8), materials.slice(8, 10), materials.slice(10, 13), materials.slice(13)];
  if (groups.some(group => {
    const x = group.filter(material => left.includes(material)), y = group.filter(material => right.includes(material));
    return x.length && y.length && !x.some(material => y.includes(material));
  })) return true;
  const thickness = (value: string) => [...value.matchAll(/\b(\d+(?:\.\d+)?)\s*mm\b/g)].map(match => Number(match[1]));
  const x = thickness(left), y = thickness(right);
  if (x.length && y.length && !x.some(value => y.includes(value))) return true;
  return [['sliding','hinged'], ['base','wall'], ['base','tall'], ['wall','tall']].some(([x,y]) =>
    (new RegExp(`\\b${x}\\b`).test(left) && new RegExp(`\\b${y}\\b`).test(right)) ||
    (new RegExp(`\\b${y}\\b`).test(left) && new RegExp(`\\b${x}\\b`).test(right)));
}

/** A close match borrows an observed rate unchanged; it never invents an adjustment. */
export function closeReferencePrice(rates: PriceEvidence[], name: string, specification: string, currency: string, location: string): PriceEvidence | undefined {
  const target = `${name} ${specification}`, nameWords = words(referenceProduct(name)), detailWords = words(specification);
  const candidates = rates.filter(row => row.source === 'admin_reference' && !row.match && row.unit === 'sqft'
    && row.currency === currency && (unknownReferenceCity(location) || referenceCity(row.location) === referenceCity(location))
    && !conflicts(target, `${row.name} ${row.description}`)).map(row => {
    const referenceName = words(referenceProduct(row.name)), referenceDetails = words(row.description);
    const nameScore = [...nameWords].filter(word => referenceName.has(word)).length / Math.max(nameWords.size, referenceName.size, 1);
    const detailScore = [...detailWords].filter(word => referenceDetails.has(word)).length / Math.max(Math.min(detailWords.size, referenceDetails.size), 1);
    return { row, score: nameScore * 0.65 + detailScore * 0.35, nameScore, detailScore };
  }).filter(candidate => candidate.nameScore >= 0.5 && ((candidate.detailScore >= 0.5 && candidate.score >= 0.7) || candidate.nameScore === 1))
    .sort((a,b) => b.score - a.score || a.row.id.localeCompare(b.row.id));
  const best = candidates[0];
  if (!best || candidates.some(candidate => best.score - candidate.score < 0.05
    && (conflicts(best.row.description, candidate.row.description) || Math.max(best.row.rate, candidate.row.rate) / Math.min(best.row.rate, candidate.row.rate) > 1.3))) return;
  const assumptions = ['Indicative close match; the requested product is not an exact specification match.',
    `Reference: ${best.row.name} — ${best.row.description}`.slice(0, 600),
    'Reference median reused without a made-up markup or material adjustment. Confirm dimensions, finish, hardware and inclusions before finalizing.'];
  return { ...best.row, id: `close-${crypto.randomUUID()}`, name, description: specification,
    confidence: 'low', match: { type: 'close', referenceName: best.row.name, referenceDescription: best.row.description, score: Math.round(best.score * 100), assumptions },
    inclusions: `${best.row.inclusions} Indicative close specification match; supplier confirmation required.`.slice(0, 600) };
}
