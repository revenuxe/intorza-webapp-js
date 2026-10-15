import { z } from 'zod';
import { draftSchema, itemCalculation, quotationTotals, type VoiceDraft } from './domain';

export const MAX_PLAN_BYTES = 10 * 1024 * 1024;
export const MAX_PLAN_FILES = 3;
const label = z.string().trim().min(1).max(150);
const dimension = z.number().finite().positive().max(100000).nullable();
export const roomSchema = z.object({
  name: label, kind: z.enum(['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'balcony', 'utility', 'study', 'other']),
  floor: z.string().max(80), widthFt: dimension, lengthFt: dimension,
  source: z.enum(['printed', 'inferred', 'unknown', 'user']), confidence: z.enum(['high', 'medium', 'low']),
  file: z.string().max(150), page: z.number().int().min(1).max(100), notes: z.string().max(600),
}).strict();
export const analysisSchema = z.object({
  propertyType: label, floors: z.number().int().min(1).max(30).nullable(),
  units: z.string().max(80), scale: z.string().max(120),
  rooms: z.array(roomSchema).min(1).max(40), warnings: z.array(z.string().max(600)).max(20),
}).strict();
export type PlanAnalysis = z.infer<typeof analysisSchema>;
export const briefSchema = z.object({
  scope: z.enum(['complete', 'kitchen-wardrobes', 'living-bedrooms', 'selected']),
  roomNames: z.array(label).min(1).max(40), finish: z.enum(['Budget-friendly', 'Standard', 'Premium', 'Luxury', 'Recommend']),
  budget: z.number().finite().positive().max(1000000000).nullable(),
  clientName: label, location: label, address: z.string().max(1000),
}).strict();
export type ProjectBrief = z.infer<typeof briefSchema>;
export const generatedSchema = z.object({
  sections: z.array(z.object({ title: label, roomName: label, items: z.array(z.object({
    productName: label, description: z.string().max(1000), rateId: z.string().max(100).nullable(),
    quantity: dimension, measurementStatus: z.enum(['measured', 'estimated', 'unknown']),
    measurementReason: z.string().max(600),
  }).strict()).min(1).max(12) }).strict()).min(1).max(12),
  assumptions: z.array(z.string().max(600)).max(20),
}).strict();
export type PriceEvidence = {
  id: string; name: string; description: string; rate: number; unit: string;
  source: 'approved' | 'historical' | 'market_estimate'; location: string; verifiedAt: string;
  currency: string; sourceUrl: string | null; inclusions: string;
  range?: { low: number; high: number };
  confidence?: 'low' | 'medium';
  sources?: { name: string; url: string; publishedDate: string | null; retrievedAt: string; quote: string; specification: string; inclusions: string }[];
};
export type Estimate = ReturnType<typeof buildEstimate>;

/** File signatures are checked independently of the client name and MIME type. */
export function detectPlanType(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_PLAN_BYTES) throw new Error('Each floor plan must be between 1 byte and 10 MB.');
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 12));
  if (head.startsWith('%PDF-') && new TextDecoder('latin1').decode(bytes.slice(-2048)).includes('%%EOF')) {
    if (new TextDecoder('latin1').decode(bytes).includes('/Encrypt')) throw new Error('Use an unlocked PDF.');
    return 'application/pdf';
  }
  if (bytes.length > 24 && bytes[0] === 137 && head.slice(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 && head.slice(8, 12) === '\0\0\0\r') return 'image/png';
  if (bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return 'image/jpeg';
  if (bytes.length > 16 && head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  throw new Error('Invalid file contents. Upload a PDF, JPG, PNG or WEBP floor plan.');
}

export function scopedRooms(analysis: PlanAnalysis, brief: Pick<ProjectBrief, 'scope' | 'roomNames'>) {
  return analysis.rooms.filter(room => brief.roomNames.includes(room.name) && (
    brief.scope === 'complete' || brief.scope === 'selected' ||
    brief.scope === 'kitchen-wardrobes' && ['kitchen', 'bedroom'].includes(room.kind) ||
    brief.scope === 'living-bedrooms' && ['living', 'bedroom'].includes(room.kind)
  ));
}

/** The model cannot set rates, taxes, totals or access another business's pricing. */
export function buildEstimate(raw: unknown, analysis: PlanAnalysis, brief: ProjectBrief, rates: PriceEvidence[], base: VoiceDraft) {
  const proposal = generatedSchema.parse(raw);
  const allowed = new Set(scopedRooms(analysis, brief).map(room => room.name));
  const evidence: { itemId: string; quantityStatus: string; reason: string; price: PriceEvidence | null }[] = [];
  const seen = new Set<string>();
  const sections = proposal.sections.map(section => {
    if (!allowed.has(section.roomName)) throw new Error('The proposal includes a room outside your selected scope.');
    return { id: crypto.randomUUID(), title: section.title, items: section.items.map(item => {
      const key = `${section.roomName}:${item.productName}`.toLowerCase();
      if (seen.has(key)) throw new Error('The proposal contains a duplicate item. Please regenerate.');
      seen.add(key);
      const price = rates.find(rate => rate.id === item.rateId && rate.unit === 'sqft'
        && rate.name.trim().toLowerCase() === item.productName.trim().toLowerCase()
        && Number.isFinite(rate.rate) && rate.rate >= 0 && rate.rate <= 10000000) ?? null;
      const id = crypto.randomUUID();
      const room = analysis.rooms.find(room => room.name === section.roomName)!;
      // Ceiling coverage is directly related to printed/user-entered room area. Cabinetry is not.
      const ceilingArea = /^false ceiling(?: work)?$/i.test(item.productName.trim())
        && ['printed','user'].includes(room.source) && room.widthFt != null && room.lengthFt != null
        ? Math.round(room.widthFt * room.lengthFt * 10000) / 10000 : null;
      // A model's interpretation is never a verified site measurement.
      evidence.push({ itemId: id, quantityStatus: ceilingArea != null ? 'estimated' : item.measurementStatus === 'measured' ? 'estimated' : item.measurementStatus,
        reason: ceilingArea != null ? `Full-room ceiling allowance: ${room.widthFt} ft × ${room.lengthFt} ft. Assumes complete ceiling coverage; verify cutouts and design.` : item.measurementReason, price });
      return { id, productName: price?.name ?? item.productName, productDetails: price?.description || item.description,
        side: '', measurementMode: 'direct_area' as const, widthFt: null, heightFt: null,
        sftArea: ceilingArea ?? (item.measurementStatus === 'unknown' ? null : item.quantity), ratePerSft: price?.rate ?? null };
    }) };
  });
  const draft = draftSchema.parse({ ...base, revision: base.revision + 1,
    project: { ...base.project, projectTitle: base.project.projectTitle || `${brief.finish} Interior Estimate`, clientName: brief.clientName, clientAddress: brief.address, placeOfProject: brief.location, projectType: analysis.propertyType }, sections });
  const items = draft.sections.flatMap(section => section.items);
  const amounts = items.map(item => Number(itemCalculation(item).cents ?? 0n) / 100);
  return { draft, evidence, roomSections: draft.sections.map((section, index) => ({ sectionId: section.id, roomName: proposal.sections[index].roomName })), totals: quotationTotals(amounts, draft.pricing),
    incomplete: items.some(item => item.sftArea == null || item.ratePerSft == null),
    assumptions: [...analysis.warnings, ...proposal.assumptions,
      ...(brief.budget != null && quotationTotals(amounts, draft.pricing).total > brief.budget ? ['The priced items exceed your target budget. Review the scope or finish before finalizing.'] : []),
      'Room floor area is not cabinetry or wall-work area. All proposed work quantities require review.',
      'Only square-foot work is inserted into this editor. Running-feet, piece, set and package work requires separate pricing; it is excluded from these totals.',
      'Historical rates are not current supplier quotes. Taxes and discounts use the existing quotation settings.'] };
}

/** Replace only reviewed rooms; refresh retained rates from the current owner-scoped sources. */
export function mergeRoomEstimates(previous: Estimate, next: Estimate, roomNames: string[], rates: PriceEvidence[]) {
  const previousDraft = draftSchema.parse(previous.draft);
  const mapping = z.array(z.object({ sectionId: z.string(), roomName: label }).strict()).max(12).parse(previous.roomSections);
  const priorEvidence = z.array(z.object({ itemId: z.string(), quantityStatus: z.string().max(30), reason: z.string().max(600), price: z.object({ id: z.string() }).passthrough().nullable() }).strict()).max(60).parse(previous.evidence);
  const retained = previousDraft.sections.filter(section => !mapping.some(row => row.sectionId === section.id && roomNames.includes(row.roomName)));
  const retainedIds = new Set(retained.flatMap(section => section.items.map(item => item.id)));
  const evidence = priorEvidence.filter(row => retainedIds.has(row.itemId)).map(row => {
    const item = retained.flatMap(section => section.items).find(item => item.id === row.itemId)!;
    const price = rates.find(rate => rate.id === row.price?.id && rate.unit === 'sqft' && rate.name.toLowerCase() === item.productName.toLowerCase()) ?? null;
    item.ratePerSft = price?.rate ?? null;
    return { itemId: row.itemId, quantityStatus: row.quantityStatus, reason: row.reason, price };
  });
  const draft = draftSchema.parse({ ...next.draft, sections: [...retained, ...next.draft.sections] });
  const items = draft.sections.flatMap(section => section.items);
  if (items.length > 60) throw new Error('Keep the estimate within 60 items.');
  return { ...next, draft, evidence: [...evidence, ...next.evidence],
    roomSections: [...mapping.filter(row => retained.some(section => section.id === row.sectionId)).map(row => ({ sectionId: row.sectionId, roomName: row.roomName })), ...next.roomSections],
    totals: quotationTotals(items.map(item => Number(itemCalculation(item).cents ?? 0n) / 100), draft.pricing),
    incomplete: items.some(item => item.sftArea == null || item.ratePerSft == null),
    assumptions: [...new Set([...z.array(z.string().max(600)).max(50).parse(previous.assumptions), ...next.assumptions])],
  };
}
