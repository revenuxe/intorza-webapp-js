import { z } from 'zod';

export const quotationDeliverySchema = z.object({
  projectId: z.string().uuid(), amount: z.number().int().nonnegative(),
  paid: z.boolean(), ready: z.boolean(),
});
export type QuotationDelivery = z.infer<typeof quotationDeliverySchema>;
export const quotationDeliveryConfirmationSchema = z.object({
  projectId: z.string().uuid(), amount: z.number().int().nonnegative(),
  paid: z.literal(true), balance: z.number().int().nonnegative(),
});
