import { z } from 'zod';
const bounded = z.string().trim().max(1000);
export const trainingItemSchema = z.object({
  section: z.string().trim().min(1).max(150), productName: z.string().trim().min(1).max(150),
  material: bounded, specification: bounded, unit: z.enum(['sqft','sqm','rft','piece','set','lump_sum']),
  quantity: z.number().finite().positive().max(1000000).nullable(),
  rate: z.number().finite().nonnegative().max(10000000).nullable(),
  tax: z.enum(['excluded','included','unknown']), installationIncluded: z.boolean(),
  page: z.number().int().min(1).max(100), notes: bounded,
}).strict();
export const trainingExtractionSchema = z.object({
  location: z.string().trim().max(150), currency: z.string().regex(/^[A-Z]{3}$/),
  priceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  projectType: z.string().max(150), items: z.array(trainingItemSchema).min(1).max(60),
  limitations: z.array(z.string().max(600)).max(20),
}).strict();
export type TrainingExtraction = z.infer<typeof trainingExtractionSchema>;
export const trainingReviewSchema = z.object({
  id: z.string().uuid(), action: z.enum(['approve','reject']),
  extraction: trainingExtractionSchema, confirmAnonymized: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.action !== 'approve') return;
  if (!value.confirmAnonymized) context.addIssue({ code: 'custom', message: 'Confirm that the shared reference contains no customer or confidential information.' });
  if (!value.extraction.location.trim()) context.addIssue({ code: 'custom', message: 'Enter the pricing city.' });
  if (!value.extraction.priceDate || !Number.isFinite(Date.parse(value.extraction.priceDate)) || Date.parse(value.extraction.priceDate) > Date.now()) context.addIssue({ code: 'custom', message: 'Enter a valid, non-future quotation price date.' });
});
