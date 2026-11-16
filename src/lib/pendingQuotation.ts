import { z } from 'zod';
const number=z.number().finite();
const pricing=z.object({gstEnabled:z.boolean(),gstRate:z.string(),discountPercentage:number,enableSocialMediaDiscount:z.boolean(),socialMediaDiscountRate:number});
const form=z.object({
 referenceNo:z.string().nullable().optional(),
 sections:z.array(z.object({id:z.string(),title:z.string(),items:z.array(z.object({id:z.string(),side:z.string(),productName:z.string(),productDetails:z.string(),measurementUnit:z.string().optional(),widthFt:number,heightFt:number,sftArea:number,ratePerSft:number,amount:number}))})),
 projectTitle:z.string().optional(),clientName:z.string().optional(),clientAddress:z.string().optional(),dateOfProposal:z.string().optional(),quotationValidTill:z.string().optional(),projectDeadline:z.string().optional(),placeOfProject:z.string().optional(),warranty:z.string().optional(),projectType:z.string().optional(),
 gstEnabled:z.boolean().optional(),gstRate:z.string().optional(),discountPercentage:number.optional(),enableSocialMediaDiscount:z.boolean().optional(),socialMediaDiscountRate:number.optional(),appliedPricing:pricing.optional(),
});
// The repository compiles without strictNullChecks; explicitly retain the
// required fields that Zod validates at runtime in its inferred output type.
type PendingQuotation=Omit<z.infer<typeof form>,'sections'|'appliedPricing'> & {
 sections:{id:string;title:string;items:{id:string;side:string;productName:string;productDetails:string;measurementUnit?:string;widthFt:number;heightFt:number;sftArea:number;ratePerSft:number;amount:number}[]}[];
 appliedPricing?:Required<z.infer<typeof pricing>>;
};
export function parsePendingQuotation(value:unknown):PendingQuotation|null{const parsed=form.safeParse(value);return parsed.success?parsed.data as PendingQuotation:null;}
