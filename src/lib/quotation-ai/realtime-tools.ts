import { z } from 'zod';
import { applyOperations, proposalSchema, reviewDraft, type VoiceDraft } from './domain';
import { assertEnglishProposal, hasNonEnglishDraft } from './english-output';
import { guidedPrompts } from './guided-flow';

// A compact wire format avoids generating dozens of unused null fields per edit.
export const realtimeToolSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    reply: { type: 'string', description: 'Brief next question in the selected spoken language.' },
    displayReply: { type: 'string', description: 'English translation of the next question.' },
    transcript: { type: 'string', description: 'English translation of the latest user answer.' },
    clarification: { type: ['string', 'null'], description: 'Spoken clarification if facts are ambiguous; no edits in this case.' },
    operationsJson: { type: 'string', description: 'JSON array of domain operations. Use only supplied fields; [] for no changes. Never invent numeric values.' },
    endConversation: { type: 'boolean', description: 'True when the user asks to hold, wait, pause, stop or finish. The app suspends the session until Resume is tapped.' },
    confirmed: { type: 'boolean', description: 'True only if the user confirms the previously populated values are correct, for example yes, sahi hai, correct, next or continue. False for explanations, corrections or new facts.' },
    focus: { type: 'string', enum: Object.keys(guidedPrompts), description: 'The field or choice that your next question asks about. Keep the same focus while explaining.' },
  },
  required: ['reply', 'displayReply', 'transcript', 'clarification', 'operationsJson', 'endConversation', 'focus', 'confirmed'],
};
const wire = z.object({ reply: z.string(), displayReply: z.string(), transcript: z.string(), clarification: z.string().nullable(), operationsJson: z.string().max(65536), endConversation: z.boolean().optional().default(false), confirmed: z.boolean().optional().default(false), focus: z.string().refine(value => Object.hasOwn(guidedPrompts, value)).optional() }).strict();
export function parseRealtimeProposal(value: unknown) {
  const { operationsJson, endConversation: _end, focus: _focus, confirmed: _confirmed, ...text } = wire.parse(value);
  const proposal = proposalSchema.parse({ ...text, operations: JSON.parse(operationsJson) });
  assertEnglishProposal(proposal);
  return proposal;
}
// The voice tool only edits an unsaved local form. Share the exact validator with
// the server; persistence still goes through the existing authenticated save path.
export function validateRealtimeChange(before: VoiceDraft, value: unknown) {
  const proposal = parseRealtimeProposal(value);
  const operations = proposal.clarification ? [] : proposal.operations;
  const draft = applyOperations(before, operations);
  if (operations.length && hasNonEnglishDraft(draft)) throw new Error('Quotation text must be English. No fields changed.');
  const review = reviewDraft(draft);
  const meta = wire.parse(value);
  return { draft, review, focus: meta.focus as keyof typeof guidedPrompts | undefined, complete: meta.endConversation, confirmed: meta.confirmed, changed: operations.length > 0, displayReply: proposal.displayReply!, transcript: proposal.transcript!, reply: proposal.clarification || proposal.reply };
}
export const realtimeOperationInstructions = `Tool operationsJson is a JSON array using these exact shapes:
{"type":"update_project","fields":{"clientName":"Rahul"}}; project fields: projectTitle,clientName,clientAddress,placeOfProject,projectType.
{"type":"add_section","title":"Bedroom"}; {"type":"update_section","sectionId":"existing-id","title":"Bedroom"}.
{"type":"add_item","sectionId":"existing-id","fields":{"productName":"Wardrobe","productDetails":"White laminate","side":"","measurementMode":"dimensions","widthFt":6,"heightFt":8,"sftArea":null,"ratePerSft":null}}; all add_item fields required, unknown numeric values null. direct_area uses sftArea, widthFt/heightFt null.
{"type":"update_item","itemId":"existing-id","fields":{"ratePerSft":1200}}; update_item fields: productName,productDetails,side,measurementMode,widthFt,heightFt,sftArea,ratePerSft. Only include changed fields.
{"type":"remove_item","itemId":"existing-id"}; {"type":"propose_pricing","fields":{"gstEnabled":true,"gstRate":18}}; pricing fields: gstEnabled,gstRate,discountPercentage,enableSocialMediaDiscount,socialMediaDiscountRate.
Never use unused null fields in updates. Empty operationsJson is "[]". Use exact existing IDs from the latest tool result. Tools return the updated draft including newly assigned section/item IDs.`;
