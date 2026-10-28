import { z } from 'zod';
import type { FinishTier } from './finish-tier';
const tierSchema = z.enum(['Basic','Standard','Premium','Luxury']).nullable();

export const workKeys = ['base_cabinets','wall_cabinets','countertop','backsplash','tall_cabinets','wardrobe','loft','bed_back','study_storage','ceiling','painting','tv_unit','wall_panelling','shoe_storage','pooja_unit','vanity','mirror','tile_work','plumbing','bookshelf','utility_storage','crockery_unit','partition','storage','flooring','electrical'] as const;
export const workExclusionSchema = z.object({ roomName: z.string().trim().min(1).max(150), workKeys: z.array(z.enum(workKeys)).max(26) }).strict();
export const roomRequirementSchema = z.object({
  roomName: z.string().trim().min(1).max(150),
  finishTier: tierSchema.optional().default(null),
  includedWorkKeys: z.array(z.enum(workKeys)).max(26).optional().default([]),
  items: z.array(z.object({ workKey: z.enum(workKeys), details: z.string().trim().min(1).max(600), finishTier: tierSchema.optional().default(null) }).strict()).max(26).optional().default([]),
}).strict();
export const requirementsSchema = z.object({
  exclusions: z.array(workExclusionSchema).max(40),
  scope: z.enum(['complete','modular','kitchen','bedrooms','kitchen-wardrobes','living-bedrooms','selected']).nullable().optional().default(null),
  roomNames: z.array(z.string().trim().min(1).max(150)).max(40).optional().default([]),
  finishTier: z.enum(['Basic','Standard','Premium','Luxury']).nullable().optional().default(null),
  designDirection: z.string().trim().max(1200).optional().default(''),
  roomRequirements: z.array(roomRequirementSchema).max(40).optional().default([]),
  reviewNotes: z.array(z.string().trim().min(1).max(600)).max(10).optional().default([]),
}).strict();
export type ProjectRequirements = z.infer<typeof requirementsSchema>;
export type WorkExclusion = z.infer<typeof workExclusionSchema>;

export function requestedWork(roomName: string, requirements?: ProjectRequirements) {
  return [...new Set((requirements?.roomRequirements ?? []).filter(row => row.roomName === roomName)
    .flatMap(row => [...(row.includedWorkKeys ?? []), ...(row.items ?? []).map(item => item.workKey)]))];
}

export function itemRequirements(product: string, roomName: string, requirements?: ProjectRequirements) {
  return (requirements?.roomRequirements ?? []).filter(row => row.roomName === roomName).flatMap(row => row.items ?? [])
    .filter(item => excludedWork(product, roomName, [{ roomName, workKeys: [item.workKey] }])).map(item => item.details).join(' ').slice(0, 600);
}

export function itemFinishTier(product: string, roomName: string, requirements: ProjectRequirements | undefined, fallback: FinishTier): FinishTier {
  const room = requirements?.roomRequirements?.find(row => row.roomName === roomName);
  const item = room?.items?.find(row => excludedWork(product, roomName, [{ roomName, workKeys: [row.workKey] }]));
  return item?.finishTier ?? room?.finishTier ?? fallback;
}

export function requirementsSource(brief: { requestNotes?: string; design?: { notes?: string }; roomWork?: { roomName?: string; notes?: string }[] }) {
  const roomNotes = (brief.roomWork ?? []).filter(room => room.notes?.trim()).map(room => ({ roomName: room.roomName, notes: room.notes.trim() }));
  if (!brief.requestNotes?.trim() && !brief.design?.notes?.trim() && !roomNotes.length) return '';
  return JSON.stringify({ notes: brief.requestNotes?.trim() ?? '', design: brief.design?.notes?.trim() ?? '', roomNotes });
}

const aliases: Partial<Record<typeof workKeys[number], RegExp>> = {
  ceiling: /\b(?:false\s+)?(?:ceilings?|cieling|seiling|seling|ceeling)\b/i,
  painting: /\b(?:(?:wall|walls)\s+)?(?:painting|paint|paintng|repainting)\b/i,
  wardrobe: /\b(?:wardrobes?|cupboards?)\b/i, loft: /\bloft(?:s| storage)?\b/i,
  flooring: /\bfloor(?:ing| tiles?)\b/i, electrical: /\b(?:electrical|electric points?|lighting)\b/i,
  plumbing: /\bplumbing\b/i, wall_panelling: /\bwall panell?ing\b/i,
  tv_unit: /\b(?:tv|television) (?:unit|cabinet|storage)\b/i, pooja_unit: /\b(?:pooja|puja) (?:unit|cabinet|room)\b/i,
  shoe_storage: /\bshoe (?:rack|storage|cabinet)\b/i, countertop: /\b(?:kitchen )?counter ?top\b/i,
  backsplash: /\bbacksplash\b/i, vanity: /\bvanity(?: cabinet)?\b/i, mirror: /\b(?:bathroom )?mirror\b/i,
  base_cabinets: /\b(?:kitchen )?base cabinets?\b/i, wall_cabinets: /\b(?:kitchen )?wall cabinets?\b/i,
  tall_cabinets: /\b(?:kitchen )?tall (?:units?|cabinets?)\b/i,
  bed_back: /\bbed back panell?ing\b/i, study_storage: /\bstudy (?:storage|desk)\b/i,
  tile_work: /\bbathroom wall tiles\b/i, bookshelf: /\bbookshel(?:f|ves)\b/i,
  utility_storage: /\b(?:utility|balcony) storage\b/i, crockery_unit: /\bcrockery unit\b/i,
  partition: /\b(?:dining )?partition\b/i, storage: /\broom storage\b/i,
};

export function excludedWork(product: string, roomName: string, exclusions: WorkExclusion[] = []) {
  const keys = exclusions.filter(row => row.roomName.toLowerCase() === roomName.toLowerCase()).flatMap(row => row.workKeys);
  return keys.some(key => aliases[key]?.test(product) || product.toLowerCase().replace(/[ _-]+/g, ' ') === key.replace(/_/g, ' '));
}

/** Conservative backup for clear negatives, including coordinated lists/typos.
 * Nuanced exceptions and room-specific language are interpreted by the model. */
export function explicitNoteExclusions(notes: string, rooms: { name?: string; kind?: string }[]): WorkExclusion[] {
  if (/\b(?:actually|instead|changed? my mind|after all|except|unless|only)\b/i.test(notes)) return [];
  const found = new Map<string, Set<typeof workKeys[number]>>();
  const clauses = notes.replace(/[’‘]/g, "'").toLowerCase().split(/[.!?;\n]+|\bbut\b|\bhowever\b/);
  for (const clause of clauses) {
    if (/\b(?:except|unless|only)\b|\bno need to (?:exclude|skip|omit)\b|\b(?:don't|do not) (?:want|need) to (?:exclude|omit|skip)\b|\b(?:don't|do not) (?:exclude|skip|omit)\b/.test(clause)) continue;
    const negative = /\b(?:no|without|exclude|skip|omit|avoid)\b|\b(?:do not|don't)\s+(?:want|need|include|add)\b|\bnot\s+(?:required|needed|wanted)\b/.exec(clause);
    if (!negative) continue;
    const scope = /not\s+(?:required|needed|wanted)/.test(negative[0]) ? clause.slice(0, negative.index) : clause.slice(negative.index + negative[0].length).split(/\b(?:include|add|keep)\b/)[0];
    if (/\b(?:dark|glossy|matte|red|blue|green|black|white|colou?r|finish|texture|required|needed|wanted)\b/.test(scope)) continue;
    // Named room modifiers need semantic interpretation to avoid excluding work
    // globally when only one room was mentioned.
    if (rooms.some(room => clause.includes(room.name.toLowerCase())) || /\b(?:bedrooms?|kitchens?|living|dining|bathrooms?|balcon(?:y|ies)|utility|study)\b/.test(clause)) continue;
    for (const [key, pattern] of Object.entries(aliases)) if (pattern.test(scope)) for (const room of rooms) {
      if (!found.has(room.name)) found.set(room.name, new Set());
      found.get(room.name)!.add(key as typeof workKeys[number]);
    }
  }
  return [...found].map(([roomName, keys]) => ({ roomName, workKeys: [...keys] }));
}

export function mergeExclusions(...groups: WorkExclusion[][]): WorkExclusion[] {
  const rooms = new Map<string, Set<typeof workKeys[number]>>();
  for (const group of groups) for (const row of group) {
    if (!rooms.has(row.roomName)) rooms.set(row.roomName, new Set());
    for (const key of row.workKeys) rooms.get(row.roomName)!.add(key);
  }
  return [...rooms].filter(([, keys]) => keys.size > 0).map(([roomName, keys]) => ({ roomName, workKeys: [...keys] }));
}

export function exclusionsForBrief(brief: { workExclusions?: WorkExclusion[]; requestNotes?: string; design?: { notes?: string } }, rooms: { name?: string; kind?: string }[]) {
  const primaryNotes = brief.requestNotes?.trim() ? brief.requestNotes : brief.design?.notes ?? '';
  return mergeExclusions(brief.workExclusions ?? [], explicitNoteExclusions(primaryNotes, rooms));
}
