import { z } from 'zod';

const text = z.string().max(1000);
const id = z.string().min(1).max(100);
const measurement = z.number().finite().positive().max(100000).nullable();
const rate = z.number().finite().nonnegative().max(10000000).nullable();
export const itemFields = z.object({
  productName: text, productDetails: text, side: z.string().max(20),
  measurementMode: z.enum(['dimensions', 'direct_area']),
  widthFt: measurement, heightFt: measurement, sftArea: measurement, ratePerSft: rate,
}).strict();
export const projectFields = z.object({
  projectTitle: text, clientName: text, clientAddress: text, placeOfProject: text, projectType: text,
}).strict();
export const pricingFields = z.object({
  gstEnabled: z.boolean(), gstRate: z.number().finite().min(0).max(100),
  discountPercentage: z.number().finite().min(0).max(100),
  enableSocialMediaDiscount: z.boolean(), socialMediaDiscountRate: z.number().finite().min(0).max(100),
}).strict();
export const draftSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(),
  project: projectFields, pricing: pricingFields,
  sections: z.array(z.object({ id, title: text, items: z.array(itemFields.extend({ id })).max(60) }).strict()).max(80),
}).strict().superRefine((draft, context) => {
  if (draft.sections.reduce((count, section) => count + section.items.length, 0) > 600) context.addIssue({ code: 'custom', message: 'Keep each quotation within 600 items.' });
});
export type VoiceDraft = z.infer<typeof draftSchema>;
export const operationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('update_project'), fields: projectFields.partial() }).strict(),
  z.object({ type: z.literal('add_section'), title: text }).strict(),
  z.object({ type: z.literal('update_section'), sectionId: id, title: text }).strict(),
  z.object({ type: z.literal('add_item'), sectionId: id, fields: itemFields }).strict(),
  z.object({ type: z.literal('update_item'), itemId: id, fields: itemFields.partial() }).strict(),
  z.object({ type: z.literal('remove_item'), itemId: id }).strict(),
  z.object({ type: z.literal('propose_pricing'), fields: pricingFields.partial() }).strict(),
]);
export const proposalSchema = z.object({
  reply: z.string().min(1).max(1500),
  operations: z.array(operationSchema).max(30),
  clarification: z.string().max(1000).nullable(),
  displayReply: z.string().max(1500).optional(),
  transcript: z.string().max(3000).optional(),
}).strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type Operation = Proposal['operations'][number];

// Integer fixed-point arithmetic: dimensions/area to 4 decimals, money to cents.
const scaled = (value: number, places: number) => BigInt(Math.round(value * 10 ** places));
const roundedDivide = (value: bigint, divisor: bigint) => (value + divisor / 2n) / divisor;
export const lineAmount = (area: number, ratePerSft: number) => Number(roundedDivide(scaled(area, 4) * scaled(ratePerSft, 2), 10000n)) / 100;
function totalsFromCents(subtotal: bigint, pricing: VoiceDraft['pricing']) {
  const percent = pricing.enableSocialMediaDiscount ? pricing.socialMediaDiscountRate : pricing.discountPercentage;
  const discount = roundedDivide(subtotal * scaled(percent, 2), 10000n);
  const tax = pricing.gstEnabled ? roundedDivide((subtotal - discount) * scaled(pricing.gstRate, 2), 10000n) : 0n;
  return { subtotal: Number(subtotal) / 100, discount: Number(discount) / 100, tax: Number(tax) / 100, total: Number(subtotal - discount + tax) / 100 };
}
export function quotationTotals(amounts: number[], pricing: VoiceDraft['pricing']) {
  return totalsFromCents(amounts.reduce((sum, amount) => sum + scaled(amount, 2), 0n), pricing);
}
export function itemCalculation(item: VoiceDraft['sections'][number]['items'][number]) {
  const areaUnits = item.measurementMode === 'dimensions'
    ? item.widthFt != null && item.heightFt != null
      ? roundedDivide(scaled(item.widthFt, 4) * scaled(item.heightFt, 4), 10000n) : null
    : item.sftArea == null ? null : scaled(item.sftArea, 4);
  const cents = areaUnits != null && item.ratePerSft != null
    ? roundedDivide(areaUnits * scaled(item.ratePerSft, 2), 10000n) : null;
  return { area: areaUnits == null ? null : Number(areaUnits) / 10000, cents };
}
export function reviewDraft(draft: VoiceDraft) {
  const missing: string[] = [];
  if (!draft.project.clientName.trim()) missing.push('Client name');
  if (!draft.project.projectTitle.trim()) missing.push('Quotation title');
  const items = draft.sections.flatMap(section => section.items);
  if (!items.length) missing.push('At least one quotation item');
  let subtotal = 0n;
  for (const [index, item] of items.entries()) {
    const label = item.productName.trim() || `Item ${index + 1}`;
    if (!item.productName.trim()) missing.push(`${label}: product name`);
    const calculation = itemCalculation(item);
    if (calculation.area == null || calculation.area <= 0) missing.push(`${label}: ${item.measurementMode === 'dimensions' ? 'width and height in feet' : 'area in square feet'}`);
    if (item.ratePerSft == null) missing.push(`${label}: rate per square foot`);
    subtotal += calculation.cents ?? 0n;
  }
  return { missing, ...totalsFromCents(subtotal, draft.pricing) };
}

export function applyOperations(draft: VoiceDraft, operations: Operation[], makeId: () => string = () => crypto.randomUUID()): VoiceDraft {
  // Zod parsing returns a deep clone, keeping rejected batches isolated.
  const next = draftSchema.parse(draft);
  for (const raw of operations) {
    const op = operationSchema.parse(raw);
    if (op.type === 'update_project') Object.assign(next.project, op.fields);
    if (op.type === 'propose_pricing') Object.assign(next.pricing, op.fields);
    if (op.type === 'add_section') next.sections.push({ id: makeId(), title: op.title, items: [] });
    if (op.type === 'update_section') {
      const section = next.sections.find(section => section.id === op.sectionId);
      if (!section) throw new Error('That section no longer exists.');
      section.title = op.title;
    }
    if (op.type === 'add_item') {
      const section = next.sections.find(s => s.id === op.sectionId);
      if (!section) throw new Error('That section no longer exists. Please try again.');
      section.items.push({ ...op.fields, id: makeId() } as VoiceDraft['sections'][number]['items'][number]);
    }
    if (op.type === 'update_item' || op.type === 'remove_item') {
      const section = next.sections.find(s => s.items.some(item => item.id === op.itemId));
      const item = section?.items.find(item => item.id === op.itemId);
      if (!item) throw new Error('That item no longer exists. Please clarify which item to change.');
      if (op.type === 'remove_item') section.items = section.items.filter(i => i.id !== op.itemId);
      else {
        const mode = op.fields.measurementMode ?? item.measurementMode;
        if ((mode === 'dimensions' && op.fields.sftArea != null) || (mode === 'direct_area' && (op.fields.widthFt != null || op.fields.heightFt != null))) {
          throw new Error('Clarify whether to use dimensions or direct square footage.');
        }
        Object.assign(item, op.fields);
        if (item.measurementMode === 'dimensions') item.sftArea = null;
        else { item.widthFt = null; item.heightFt = null; }
      }
    }
  }
  next.revision += operations.length ? 1 : 0;
  const parsed = draftSchema.parse(next);
  for (const item of parsed.sections.flatMap(section => section.items)) {
    if ((item.measurementMode === 'dimensions' && item.sftArea != null) || (item.measurementMode === 'direct_area' && (item.widthFt != null || item.heightFt != null))) throw new Error('Conflicting measurement modes.');
  }
  const sectionIds = parsed.sections.map(section => section.id);
  const itemIds = parsed.sections.flatMap(section => section.items.map(item => item.id));
  if (new Set(sectionIds).size !== sectionIds.length || new Set(itemIds).size !== itemIds.length || itemIds.length > 600) throw new Error('Draft exceeds item limits or contains duplicate identifiers.');
  return parsed;
}

export type LegacySection = { id: string; title: string; items: { id: string; productName: string; productDetails: string; side: string; widthFt: number; heightFt: number; sftArea: number; ratePerSft: number; amount: number }[] };
export function fromQuotation(project: VoiceDraft['project'], sections: LegacySection[], pricing: VoiceDraft['pricing']): VoiceDraft {
  return draftSchema.parse({ version: 1, revision: 0, project, pricing, sections: sections.map(section => ({ ...section,
    items: section.items.filter(item => item.productName || item.productDetails || item.widthFt || item.heightFt || item.sftArea || item.ratePerSft).map(item => ({
      id: item.id, productName: item.productName, productDetails: item.productDetails, side: item.side,
      measurementMode: (item.widthFt > 0 || item.heightFt > 0) && (!item.sftArea || Math.abs(item.widthFt * item.heightFt - item.sftArea) < 0.0001) ? 'dimensions' : 'direct_area',
      widthFt: (item.widthFt > 0 || item.heightFt > 0) && (!item.sftArea || Math.abs(item.widthFt * item.heightFt - item.sftArea) < 0.0001) ? item.widthFt || null : null,
      heightFt: (item.widthFt > 0 || item.heightFt > 0) && (!item.sftArea || Math.abs(item.widthFt * item.heightFt - item.sftArea) < 0.0001) ? item.heightFt || null : null,
      sftArea: item.widthFt > 0 && item.heightFt > 0 && Math.abs(item.widthFt * item.heightFt - item.sftArea) < 0.0001 ? null : item.sftArea > 0 ? item.sftArea : null,
      ratePerSft: item.ratePerSft > 0 ? item.ratePerSft : null,
    })) })) });
}
export function toQuotation(draft: VoiceDraft, allowIncomplete = false): LegacySection[] {
  const checked = draftSchema.parse(draft);
  if (!allowIncomplete && reviewDraft(checked).missing.length) throw new Error('Complete the required quotation details before applying.');
  return checked.sections.map(section => ({ id: section.id, title: section.title, items: section.items.map(item => {
    const { area, cents } = itemCalculation(item);
    return { id: item.id, productName: item.productName, productDetails: item.productDetails, side: item.side,
      widthFt: item.measurementMode === 'dimensions' ? item.widthFt ?? 0 : 0,
      heightFt: item.measurementMode === 'dimensions' ? item.heightFt ?? 0 : 0,
      sftArea: area ?? 0, ratePerSft: item.ratePerSft ?? 0, amount: Number(cents ?? 0n) / 100 };
  }) }));
}
