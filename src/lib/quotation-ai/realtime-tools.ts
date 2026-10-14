import { z } from 'zod';
import { applyOperations, proposalSchema, reviewDraft, type VoiceDraft } from './domain';
import { assertEnglishProposal, hasNonEnglishDraft } from './english-output';

// A compact wire format avoids generating dozens of unused null fields per edit.
export const realtimeToolSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    reply: { type: 'string', description: 'Brief next question in the selected spoken language.' },
    displayReply: { type: 'string', description: 'English translation of the next question.' },
    transcript: { type: 'string', description: 'English translation of the latest user answer.' },
    clarification: { type: ['string', 'null'], description: 'Spoken clarification if facts are ambiguous; no edits in this case.' },
    operationsJson: { type: 'string', description: 'JSON array of domain operations. Use only supplied fields; [] for no changes. Never invent numeric values.' },
    endConversation: { type: 'boolean', description: 'True only when the user explicitly asks to stop, finish or end the conversation.' },
  },
  required: ['reply', 'displayReply', 'transcript', 'clarification', 'operationsJson', 'endConversation'],
};
const wire = z.object({ reply: z.string(), displayReply: z.string(), transcript: z.string(), clarification: z.string().nullable(), operationsJson: z.string().max(65536), endConversation: z.boolean().optional().default(false) }).strict();
export function parseRealtimeProposal(value: unknown) {
  const { operationsJson, endConversation: _end, ...text } = wire.parse(value);
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
  return { draft, review, complete: wire.parse(value).endConversation || review.missing.length === 0, changed: operations.length > 0, displayReply: proposal.displayReply!, transcript: proposal.transcript!, reply: proposal.clarification || proposal.reply };
}
export const realtimeOperationInstructions = `Tool operationsJson is a JSON array using these exact shapes:
{"type":"update_project","fields":{"clientName":"Rahul"}}; project fields: projectTitle,clientName,clientAddress,placeOfProject,projectType.
{"type":"add_section","title":"Bedroom"}; {"type":"update_section","sectionId":"existing-id","title":"Bedroom"}.
{"type":"add_item","sectionId":"existing-id","fields":{"productName":"Wardrobe","productDetails":"White laminate","side":"","measurementMode":"dimensions","widthFt":6,"heightFt":8,"sftArea":null,"ratePerSft":null}}; all add_item fields required, unknown numeric values null. direct_area uses sftArea, widthFt/heightFt null.
{"type":"update_item","itemId":"existing-id","fields":{"ratePerSft":1200}}; update_item fields: productName,productDetails,side,measurementMode,widthFt,heightFt,sftArea,ratePerSft. Only include changed fields.
{"type":"remove_item","itemId":"existing-id"}; {"type":"propose_pricing","fields":{"gstEnabled":true,"gstRate":18}}; pricing fields: gstEnabled,gstRate,discountPercentage,enableSocialMediaDiscount,socialMediaDiscountRate.
Never use unused null fields in updates. Empty operationsJson is "[]". Use exact existing IDs from the latest tool result. Tools return the updated draft including newly assigned section/item IDs.`;
