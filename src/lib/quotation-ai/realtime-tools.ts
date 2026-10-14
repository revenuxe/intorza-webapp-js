import { z } from 'zod';
import { applyOperations, proposalSchema, reviewDraft, type VoiceDraft } from './domain';
import { assertEnglishProposal, hasNonEnglishDraft, isEnglishScript } from './english-output';
import { guidedPrompts } from './guided-flow';

// A compact wire format avoids generating dozens of unused null fields per edit.
export const realtimeToolSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    reply: { type: 'string', description: 'Brief next question in the selected spoken language.' },
    displayReply: { type: 'string', description: 'English translation of the next question.' },
    transcript: { type: 'string', description: 'English semantic translation of the latest user answer, NOT Hindi or Roman Hinglish. For example: My name is Aslam; What does width mean? Empty only for the opening question before any user answer, with no operations.' },
    clarification: { type: ['string', 'null'], description: 'Spoken clarification if facts are ambiguous; no edits in this case.' },
    operationsJson: { type: 'string', description: 'JSON array of domain operations. Use only supplied fields; [] for no changes. Never invent numeric values.' },
    endConversation: { type: 'boolean', description: 'True when the user asks to hold, wait, pause, stop or finish. The app suspends the session until Resume is tapped.' },
    confirmed: { type: 'boolean', description: 'True only if the user confirms the previously populated values are correct, for example yes, sahi hai, correct, next or continue. False for explanations, corrections or new facts.' },
    focus: { type: 'string', enum: Object.keys(guidedPrompts), description: 'The field or choice that your next question asks about. Keep the same focus while explaining.' },
  },
  required: ['reply', 'displayReply', 'transcript', 'clarification', 'operationsJson', 'endConversation', 'focus', 'confirmed'],
};
const wire = z.object({ reply: z.string(), displayReply: z.string(), transcript: z.string(), clarification: z.string().nullable(), operationsJson: z.string().max(65536), endConversation: z.boolean().optional().default(false), confirmed: z.boolean().optional().default(false), focus: z.string().refine(value => Object.hasOwn(guidedPrompts, value)).optional() }).strict();
export function parseRealtimeProposal(value: unknown, options: { allowEmptyTranscript?: boolean } = {}) {
  const { operationsJson, endConversation: _end, focus: _focus, confirmed: _confirmed, ...text } = wire.parse(value);
  const proposal = proposalSchema.parse({ ...text, operations: JSON.parse(operationsJson) });
  assertEnglishProposal(proposal, { allowEmptyTranscript: options.allowEmptyTranscript === true && proposal.operations.length === 0 });
  return proposal;
}
export function isFaithfulLanguageRepair(original: unknown, repaired: unknown) {
  const before = wire.parse(original); const after = wire.parse(repaired);
  if (before.confirmed !== after.confirmed || before.endConversation !== after.endConversation || before.focus !== after.focus || Boolean(before.clarification) !== Boolean(after.clarification)) return false;
  const oldOps = proposalSchema.shape.operations.parse(JSON.parse(before.operationsJson));
  const newOps = proposalSchema.shape.operations.parse(JSON.parse(after.operationsJson));
  const equalKeys = (left: object, right: object) => JSON.stringify(Object.keys(left).sort()) === JSON.stringify(Object.keys(right).sort());
  const sameValue = (old: unknown, next: unknown) => typeof old === 'string' && !isEnglishScript(old) ? typeof next === 'string' && isEnglishScript(next) && !!next.trim() : old === next;
  return oldOps.length === newOps.length && oldOps.every((old, index) => {
    const next = newOps[index];
    if (old.type !== next.type || !equalKeys(old, next)) return false;
    return Object.entries(old).every(([key, value]) => {
      const candidate = (next as Record<string, unknown>)[key];
      if (key === 'fields') {
        const fields = value as Record<string, unknown>; const nextFields = candidate as Record<string, unknown>;
        return equalKeys(fields, nextFields) && Object.entries(fields).every(([name, fieldValue]) => sameValue(fieldValue, nextFields[name]));
      }
      return key === 'title' ? sameValue(value, candidate) : value === candidate;
    });
  });
}
// The voice tool only edits an unsaved local form. Share the exact validator with
// the server; persistence still goes through the existing authenticated save path.
export function validateRealtimeChange(before: VoiceDraft, value: unknown, options: { allowEmptyTranscript?: boolean } = {}) {
  const proposal = parseRealtimeProposal(value, options);
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
