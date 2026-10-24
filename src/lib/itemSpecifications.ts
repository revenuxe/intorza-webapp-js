import { z } from 'zod';
/** Canonical structured values, with a readable legacy adapter for old drafts/templates. */
export type ItemSpecification = { label: string; value: string };
const heading = 'Specifications:\n';
export function splitItemDetails(value: string) {
  const marker = '\n\n' + heading;
  const start = value.lastIndexOf(marker);
  const offset = start >= 0 ? start + marker.length : value.startsWith(heading) ? heading.length : -1;
  if (offset < 0) return { description: value, specifications: [] as ItemSpecification[] };
  const lines = value.slice(offset).split('\n');
  const specifications: ItemSpecification[] = [];
  for (const line of lines) {
    const match = /^([^:\r\n]{1,40}): (.+)$/.exec(line);
    if (!match || !match[1].trim() || !match[2].trim()) return { description: value, specifications: [] as ItemSpecification[] };
    specifications.push({ label: match[1].trim(), value: match[2].trim() });
  }
  if (specifications.length > 20 || specifications.some(row => row.value.length > 160) || new Set(specifications.map(row => row.label.toLowerCase())).size !== specifications.length) return { description: value, specifications: [] as ItemSpecification[] };
  return { description: start >= 0 ? value.slice(0, start) : '', specifications };
}
export function combineItemDetails(description: string, specifications: ItemSpecification[]) {
  const rows = specifications.filter(row => row.label.trim() && row.value.trim());
  if (!rows.length) return description;
  return (description.trimEnd() ? description.trimEnd() + '\n\n' : '') + heading + rows.map(row => `${row.label.trim()}: ${row.value.trim()}`).join('\n');
}
export const specificationAttributes: Record<string, string[]> = {
  Material: ['BWP Plywood', 'BWR Plywood', 'MDF', 'HDHMR', 'Gypsum Board', 'Solid Wood'],
  Brand: ['Century', 'Greenply', 'Gyproc', 'Asian Paints', 'Havells'],
  Finish: ['Laminate', 'Acrylic', 'Veneer', 'PU Paint', 'Duco', 'Membrane'],
  Hardware: ['Hettich', 'Hafele', 'Blum', 'Ebco'],
  'Colour / Code': [], Product: ['Royale', 'Apcolite', 'Tractor Emulsion'], Model: [], Thickness: [],
};

export const itemSpecificationsSchema = z.array(z.object({
  label: z.string().trim().min(1).max(40).regex(/^[^:\r\n]+$/),
  value: z.string().trim().min(1).max(160).regex(/^[^\r\n]+$/),
}).strict()).max(20).superRefine((rows, context) => {
  const labels = rows.map(row => row.label.toLowerCase());
  if (new Set(labels).size !== labels.length) context.addIssue({ code: 'custom', message: 'Specification names must be unique.' });
});
export function normalizeItemDetails(description: string | null | undefined, specifications?: unknown) {
  const legacy = splitItemDetails(description ?? '');
  return { description: legacy.description, specifications: specifications == null ? legacy.specifications : itemSpecificationsSchema.parse(specifications) as ItemSpecification[] };
}
export function formatItemDetails(description: string | null | undefined, specifications?: unknown) {
  const normalized = normalizeItemDetails(description, specifications);
  return combineItemDetails(normalized.description, normalized.specifications);
}
