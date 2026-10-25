import { itemSpecificationsSchema } from '@/lib/itemSpecifications';
import { z } from 'zod';
import { draftSchema, itemCalculation, quotationTotals, type VoiceDraft } from './domain';
import { roomWorkSchema, roomWorkOptions } from './room-work';
import { normalizeReferenceText, referenceProduct } from './reference-pricing';

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
export const kitchenPreferencesSchema = z.object({
  layout: z.enum(['straight','l_shape','u_shape','parallel','island','unknown']).optional(),
  carcass: z.enum(['bwr_plywood','marine_plywood','hdhmr','unknown']).optional(),
  shutter: z.enum(['laminate','acrylic','membrane','pu','veneer','unknown']).optional(),
  hardware: z.enum(['standard','soft_close','premium_branded','unknown']).optional(),
  countertop: z.enum(['granite','quartz','solid_surface','unknown']).optional(),
  appliances: z.string().trim().max(600).optional(),
}).strict();
export const resolveFinishTier = (finish: 'Basic' | 'Standard' | 'Premium' | 'Luxury' | 'Recommend', budget: number | null, estimatedTotal: number | null): 'Basic' | 'Standard' | 'Premium' | 'Luxury' => {
  if (finish !== 'Recommend') return finish;
  if (!budget || !estimatedTotal || estimatedTotal <= 0) return 'Standard';
  const ratio = budget / estimatedTotal;
  return ratio < 0.8 ? 'Basic' : ratio > 1.5 ? 'Premium' : 'Standard';
};
export const briefSchema = z.object({
  scope: z.enum(['complete', 'modular', 'kitchen', 'bedrooms', 'kitchen-wardrobes', 'living-bedrooms', 'selected']),
  roomNames: z.array(label).min(1).max(40), finish: z.enum(['Basic', 'Standard', 'Premium', 'Luxury', 'Recommend']),
  budget: z.number().finite().positive().max(1000000000).nullable(),
  clientName: z.string().trim().max(150), location: label, address: z.string().max(1000),
  roomWork: z.array(roomWorkSchema).max(40).optional(),
  kitchenPreferences: kitchenPreferencesSchema.optional(),
  automatic: z.boolean().optional(),
  requestNotes: z.string().trim().max(600).optional(),
  quoteExtras: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  measurementInputUnit: z.enum(['sqft','feet','sqm','metres']).optional(),
  design: z.object({ coordinatedLook: z.boolean().nullable(), retainExisting: z.boolean().nullable(), notes: z.string().trim().max(600) }).strict().optional(),
}).strict();
export type ProjectBrief = z.infer<typeof briefSchema>;
export const generatedSchema = z.object({
  sections: z.array(z.object({ title: label, roomName: label, items: z.array(z.object({
    specifications: itemSpecificationsSchema.optional(), side: z.string().max(20).optional(),
    productName: label, description: z.string().max(1000), rateId: z.string().max(100).nullable(),
    quantity: dimension, measurementStatus: z.enum(['measured', 'estimated', 'unknown']),
    measurementReason: z.string().max(600),
  }).strict()).min(1).max(20) }).strict()).min(1).max(40),
  assumptions: z.array(z.string().max(600)).max(20),
}).strict();
export type PriceEvidence = {
  id: string; name: string; description: string; rate: number; unit: string;
  source: 'approved' | 'historical' | 'market_estimate' | 'admin_reference' | 'manual' | 'ai_estimate'; location: string; verifiedAt: string;
  currency: string; sourceUrl: string | null; inclusions: string;
  range?: { low: number; high: number };
  confidence?: 'low' | 'medium';
  basisWarnings?: string[];
  match?: { type: 'close'; referenceName: string; referenceDescription: string; score: number; assumptions: string[] };
  sources?: { name: string; url: string; publishedDate: string | null; retrievedAt: string; quote: string; specification: string; inclusions: string }[];
};
export type Estimate = ReturnType<typeof buildEstimate>;
export const estimateCompletionSchema = z.object({ action: z.literal('complete'), projectId: z.string().uuid(),
  changes: z.array(z.object({ itemId: z.string().uuid(), widthFt: dimension, heightFt: dimension,
    areaSqft: dimension.optional(),
    ratePerSft: z.number().finite().nonnegative().max(10000000).nullable(),
  }).strict()).min(1).max(600),
}).strict();

export function completeEstimate(previous: Estimate, changes: z.infer<typeof estimateCompletionSchema>['changes']) {
  const draft = draftSchema.parse(previous.draft);
  const evidence = previous.evidence.map(row => ({ ...row }));
  for (const change of changes) {
    const item = draft.sections.flatMap(section => section.items).find(row => row.id === change.itemId);
    if (!item) throw new Error('This estimate item is no longer available.');
    const row = evidence.find(row => row.itemId === item.id);
    if (change.widthFt != null || change.heightFt != null) {
      if (change.widthFt == null || change.heightFt == null) throw new Error('Enter both width/length and height in feet.');
      item.measurementMode = 'dimensions'; item.widthFt = change.widthFt; item.heightFt = change.heightFt; item.sftArea = null;
      if (row) { row.quantityStatus = 'user_entered'; row.reason = `Work face entered by you: ${change.widthFt} ft × ${change.heightFt} ft. Verify before final confirmation.`; }
    }
    if (change.areaSqft != null) {
      if (change.widthFt != null || change.heightFt != null) throw new Error('Enter either square-foot area or work dimensions, not both.');
      item.measurementMode = 'direct_area'; item.widthFt = null; item.heightFt = null; item.sftArea = change.areaSqft;
      if (row) { row.quantityStatus = 'user_entered'; row.reason = `Work coverage entered by you: ${change.areaSqft} sqft. Verify before final confirmation.`; }
    }
    if (change.ratePerSft != null && change.ratePerSft !== item.ratePerSft) {
      item.ratePerSft = change.ratePerSft;
      if (row) row.price = { id: `manual-${item.id}`, name: item.productName, description: item.productDetails, rate: change.ratePerSft, unit: 'sqft', source: 'manual', currency: row.price?.currency || '', location: draft.project.placeOfProject,
        verifiedAt: new Date().toISOString(), sourceUrl: null, inclusions: 'Rate entered explicitly by the user; supplier inclusions and GST must be checked.' };
    }
  }
  draft.revision++;
  const items = draft.sections.flatMap(section => section.items);
  return { ...previous, draft: draftSchema.parse(draft), evidence,
    totals: quotationTotals(items.map(item => Number(itemCalculation(item).cents ?? 0n) / 100), draft.pricing),
    incomplete: items.some(item => itemCalculation(item).area == null || item.ratePerSft == null),
  };
}

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
    brief.scope === 'complete' || brief.scope === 'modular' || brief.scope === 'selected' ||
    brief.scope === 'kitchen' && room.kind === 'kitchen' ||
    brief.scope === 'bedrooms' && room.kind === 'bedroom' ||
    brief.scope === 'kitchen-wardrobes' && ['kitchen', 'bedroom'].includes(room.kind) ||
    brief.scope === 'living-bedrooms' && ['living', 'bedroom'].includes(room.kind)
  ));
}

function conciseProductDetails(value: string, fallback: string) {
  const clean = value.replace(/\s+/g, ' ').replace(/\b(?:pricing specification|provisional reference price)\b[\s\S]*/i, '').trim();
  if (!clean) return `${fallback} as per the selected design.`;
  if (clean.length <= 600) return clean;
  return `${clean.slice(0, 597).replace(/\s+\S*$/, '').trim()}…`;
}

type AutomaticAllowance = { area: number; widthFt: number; heightFt: number; reason: string };
/**
 * Fast-upload estimates need a useful first total. These are intentionally
 * conservative work-face allowances, never floor areas, and are labelled for
 * review. A customer-entered room-work choice always takes precedence.
 */
export function automaticWorkFaceAllowance(room: PlanAnalysis['rooms'][number], productName: string): AutomaticAllowance | null {
  if (!['printed', 'user'].includes(room.source) || room.widthFt == null || room.lengthFt == null) return null;
  const wall = Math.max(room.widthFt, room.lengthFt);
  const product = referenceProduct(productName);
  const coverage = (length: number, height: number, label: string) => ({
    widthFt: Math.round(length * 10000) / 10000, heightFt: height,
    area: Math.round(length * height * 10000) / 10000,
    reason: `AI-estimated ${label}: ${length} ft × ${height} ft from the room's longest ${wall} ft wall. Editable; verify on site.`,
  });
  if (product === 'wardrobe') return coverage(Math.max(6, Math.min(wall * 0.7, 8)), 7, 'wardrobe work face');
  if (product === 'tv unit') return coverage(Math.min(wall, 6), 7, 'TV-unit work face');
  const kitchenRun = Math.min(room.widthFt + room.lengthFt, 24);
  if (product === 'kitchen base cabinets') return coverage(kitchenRun, 2.5, 'base-cabinet work face');
  if (product === 'kitchen wall cabinets') return coverage(kitchenRun, 1.5, 'wall-cabinet work face');
  if (product === 'kitchen tall unit') return coverage(Math.min(wall, 8), 7, 'tall-unit work face');
  if (product === 'bed back panelling') return coverage(Math.min(wall, 8), 4, 'bed-back panelling');
  if (product === 'study storage' || product === 'bookshelf') return coverage(Math.min(wall, 8), 7, 'storage work face');
  if (product === 'kitchen countertop') return coverage(Math.min(wall, 12), 2, 'countertop coverage');
  if (product === 'kitchen backsplash') return coverage(Math.min(wall, 12), 2, 'backsplash coverage');
  if (product === 'wall panelling') return coverage(Math.min(wall, 10), 4, 'wall-panelling coverage');
  if (product === 'shoe storage') return coverage(Math.min(wall, 5), 4, 'shoe-storage work face');
  if (product === 'loft storage') return coverage(Math.min(wall, 12), 2.5, 'loft work face');
  if (product === 'crockery unit') return coverage(Math.min(wall, 6), 7, 'crockery-unit work face');
  if (product === 'vanity cabinet') return coverage(Math.min(wall, 4), 2.5, 'vanity work face');
  if (product === 'utility storage' || product === 'balcony storage') return coverage(Math.min(wall, 6), 7, 'utility-storage work face');
  if (product === 'false ceiling' || product === 'flooring') return {
    widthFt: room.widthFt, heightFt: room.lengthFt,
    area: Math.round(room.widthFt * room.lengthFt * 10000) / 10000,
    reason: `AI-estimated full-room coverage: ${room.widthFt} ft × ${room.lengthFt} ft. Height column represents plan length. Verify cutouts and actual coverage.`,
  };
  if (product === 'wall painting') {
    const perimeter = Math.round(2 * (room.widthFt + room.lengthFt) * 10000) / 10000;
    return { widthFt: perimeter, heightFt: 10, area: Math.round(perimeter * 10 * 10000) / 10000,
      reason: `AI-estimated gross wall painting: room perimeter ${perimeter} ft × assumed 10 ft wall height. No door/window deductions; excludes ceiling paint. Confirm wall height and net coverage on site.` };
  }
  return null;
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
      const key = `${section.roomName}:${normalizeReferenceText(item.productName)}`.toLowerCase();
      if (seen.has(key)) throw new Error('The proposal contains a duplicate item. Please regenerate.');
      seen.add(key);
      const price = rates.find(rate => rate.id === item.rateId && rate.unit === 'sqft'
        && !/Billing: (piece|lump_sum); price separately/i.test(item.description)
        && referenceProduct(rate.name) === referenceProduct(item.productName)
        && Number.isFinite(rate.rate) && rate.rate >= 0 && rate.rate <= 10000000) ?? null;
      const id = crypto.randomUUID();
      const room = analysis.rooms.find(room => room.name === section.roomName)!;
      // Ceiling coverage is directly related to printed/user-entered room area. Cabinetry is not.
      const workAnswer = brief.roomWork?.find(answer => answer.roomName === room.name);
      const work = workAnswer?.items.find(answer => roomWorkOptions(room, brief.scope).find(option => option.key === answer.key)?.name === item.productName);
      const explicitDimensions = work?.widthFt != null && work?.heightFt != null;
      const ceilingArea = !workAnswer && /^false ceiling(?: work)?$/i.test(normalizeReferenceText(item.productName))
        && ['printed','user'].includes(room.source) && room.widthFt != null && room.lengthFt != null
        ? Math.round(room.widthFt * room.lengthFt * 10000) / 10000 : null;
      const automaticAllowance = !workAnswer && brief.automatic ? automaticWorkFaceAllowance(room, item.productName) : null;
      // Retain a plausible model estimate in quick-upload mode, but replace an
      // implausible one (for example a 300 sqft wardrobe) with a bounded
      // room-based work-face allowance.
      const modelEstimate = item.measurementStatus === 'estimated' && item.quantity != null
        && (!automaticAllowance || (item.quantity >= automaticAllowance.area * 0.35 && item.quantity <= automaticAllowance.area * 1.3))
        ? item.quantity : null;
      const autoArea = automaticAllowance && modelEstimate == null ? automaticAllowance.area : modelEstimate;
      const autoReason = automaticAllowance && modelEstimate == null ? automaticAllowance.reason
        : modelEstimate != null ? `AI-estimated work coverage: ${modelEstimate} sqft. Editable; verify on site.` : null;
      // A model's interpretation is never a verified site measurement.
      evidence.push({ itemId: id, quantityStatus: work && item.quantity != null ? 'user_entered' : ceilingArea != null || autoArea != null ? 'estimated' : item.measurementStatus === 'measured' ? 'estimated' : item.measurementStatus,
        reason: ceilingArea != null ? `Full-room ceiling allowance: ${room.widthFt} ft × ${room.lengthFt} ft. Assumes complete ceiling coverage; verify cutouts and design.` : autoReason ?? item.measurementReason, price });
      const productName = price?.name ?? item.productName;
      // Automatic quantities are reproducible from the plan and explicit assumptions.
      // Never reverse-engineer dimensions from a model's area-only quantity.
      const dimensions = explicitDimensions ? { widthFt: work.widthFt!, heightFt: work.heightFt! }
        : automaticAllowance && brief.automatic ? automaticAllowance : null;
      if (dimensions && !explicitDimensions) {
        const row = evidence[evidence.length - 1];
        row.quantityStatus = 'estimated'; row.reason = automaticAllowance!.reason;
      }
      const details = conciseProductDetails(item.description, productName);
      const specification = price?.description && !normalizeReferenceText(details).includes(normalizeReferenceText(price.description))
        ? `Pricing specification: ${price.description}` : '';
      return { id, productName, productDetails: [details, specification, ...(price?.basisWarnings ?? [])].filter(Boolean).join(' ').slice(0, 1000),
        ...(item.specifications?.length ? { specifications: item.specifications } : {}),
        side: item.side ?? '', measurementMode: dimensions ? 'dimensions' as const : 'direct_area' as const,
        widthFt: dimensions?.widthFt ?? null, heightFt: dimensions?.heightFt ?? null,
        sftArea: dimensions ? null : ceilingArea ?? autoArea ?? (item.measurementStatus === 'unknown' ? null : item.quantity), ratePerSft: price?.rate ?? null };
    }) };
  });
  const draft = draftSchema.parse({ ...base, revision: base.revision + 1,
    project: { ...base.project, projectTitle: base.project.projectTitle || `${brief.finish} Interior Estimate`, clientName: brief.clientName, clientAddress: brief.address, placeOfProject: brief.location, projectType: analysis.propertyType }, sections });
  const items = draft.sections.flatMap(section => section.items);
  const amounts = items.map(item => Number(itemCalculation(item).cents ?? 0n) / 100);
  return { draft, evidence, scopeGaps: [...allowed].filter(name => !proposal.sections.some(section => section.roomName === name)), roomSections: draft.sections.map((section, index) => ({ sectionId: section.id, roomName: proposal.sections[index].roomName })), totals: quotationTotals(amounts, draft.pricing),
    incomplete: items.some(item => itemCalculation(item).area == null || item.ratePerSft == null),
    assumptions: [...analysis.warnings, ...proposal.assumptions,
      ...(brief.budget != null && quotationTotals(amounts, draft.pricing).total > brief.budget ? ['The priced items exceed your target budget. Review the scope or finish before finalizing.'] : []),
      'Room floor area is not cabinetry or wall-work area. All proposed work quantities require review.',
      'Square-foot work uses the existing editor calculation. Selected piece/package services remain listed with separate pricing pending and are excluded from provisional totals.',
      'Historical rates are not current supplier quotes. Taxes and discounts use the existing quotation settings.'] };
}

/** Refining details must not silently replace a room with fewer work fields. */
export function preserveRefinedItems(previous: Estimate, next: Estimate, brief: ProjectBrief): Estimate {
  const draft = draftSchema.parse(next.draft);
  const evidence = next.evidence.map(row => ({ ...row }));
  const roomSections = next.roomSections.map(row => ({ ...row }));
  for (const section of draft.sections) {
    const roomName = roomSections.find(row => row.sectionId === section.id)?.roomName;
    const oldSections = previous.draft.sections.filter(old => previous.roomSections.some(row => row.sectionId === old.id && row.roomName === roomName));
    const oldItems = oldSections.flatMap(old => old.items);
    for (const item of section.items) {
      const old = oldItems.find(old => old.productName.trim().toLowerCase() === item.productName.trim().toLowerCase());
      if (!old) continue;
      const row = evidence.find(row => row.itemId === item.id)!;
      const oldEvidence = previous.evidence.find(row => row.itemId === old.id);
      row.itemId = old.id; item.id = old.id;
      if (oldEvidence?.price?.source === 'manual') { item.ratePerSft = old.ratePerSft; row.price = oldEvidence.price; }
      if (oldEvidence?.quantityStatus === 'user_entered' && row.quantityStatus !== 'user_entered') {
        item.measurementMode = old.measurementMode; item.widthFt = old.widthFt; item.heightFt = old.heightFt; item.sftArea = old.sftArea;
        row.quantityStatus = oldEvidence.quantityStatus; row.reason = oldEvidence.reason;
      }
    }
    // A confirmed checklist explicitly defines additions/removals. Older
    // estimates without that checklist retain unmatched rows during refinement.
    if (!brief.roomWork?.some(answer => answer.roomName === roomName)) for (const old of oldItems) {
      if (section.items.some(item => item.id === old.id)) continue;
      section.items.push({ ...old });
      const row = previous.evidence.find(row => row.itemId === old.id);
      if (row) evidence.push({ ...row });
    }
    if (oldSections.length === 1) {
      const mapping = roomSections.find(row => row.sectionId === section.id)!;
      section.id = oldSections[0].id; mapping.sectionId = section.id;
    }
  }
  return completeEstimate({ ...next, draft, evidence, roomSections }, []);
}

/** Replace only reviewed rooms; refresh retained rates from the current owner-scoped sources. */
export function mergeRoomEstimates(previous: Estimate, next: Estimate, roomNames: string[], rates: PriceEvidence[]) {
  const previousDraft = draftSchema.parse(previous.draft);
  const mapping = z.array(z.object({ sectionId: z.string(), roomName: label }).strict()).max(80).parse(previous.roomSections);
  const priorEvidence = z.array(z.object({ itemId: z.string(), quantityStatus: z.string().max(30), reason: z.string().max(600), price: z.object({ id: z.string() }).passthrough().nullable() }).strict()).max(600).parse(previous.evidence);
  const retained = previousDraft.sections.filter(section => !mapping.some(row => row.sectionId === section.id && roomNames.includes(row.roomName)));
  const retainedIds = new Set(retained.flatMap(section => section.items.map(item => item.id)));
  const evidence = priorEvidence.filter(row => retainedIds.has(row.itemId)).map(row => {
    const item = retained.flatMap(section => section.items).find(item => item.id === row.itemId)!;
    const price = row.price?.source === 'manual' || row.price?.source === 'ai_estimate' ? row.price as PriceEvidence
      : rates.find(rate => rate.id === row.price?.id && rate.unit === 'sqft' && rate.name.toLowerCase() === item.productName.toLowerCase()) ?? null;
    item.ratePerSft = price?.rate ?? null;
    return { itemId: row.itemId, quantityStatus: row.quantityStatus, reason: row.reason, price };
  });
  const draft = draftSchema.parse({ ...next.draft, sections: [...retained, ...next.draft.sections] });
  const items = draft.sections.flatMap(section => section.items);
  if (items.length > 600) throw new Error('Keep the estimate within 600 items.');
  return { ...next, draft, evidence: [...evidence, ...next.evidence],
    roomSections: [...mapping.filter(row => retained.some(section => section.id === row.sectionId)).map(row => ({ sectionId: row.sectionId, roomName: row.roomName })), ...next.roomSections],
    totals: quotationTotals(items.map(item => Number(itemCalculation(item).cents ?? 0n) / 100), draft.pricing),
    incomplete: items.some(item => itemCalculation(item).area == null || item.ratePerSft == null),
    assumptions: [...new Set([...z.array(z.string().max(600)).max(50).parse(previous.assumptions), ...next.assumptions])],
  };
}
