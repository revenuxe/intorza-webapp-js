import type { Proposal, VoiceDraft } from './domain';
import { ProviderError } from './provider';

const nonLatinLetter = /(?=\p{L})\P{Script=Latin}/u;
export function isEnglishScript(text: string) { return !nonLatinLetter.test(text); }
export function assertEnglishProposal(proposal: Proposal, options: { allowEmptyTranscript?: boolean } = {}) {
  const validTranscript = typeof proposal.transcript === 'string' && (proposal.transcript.trim().length > 0 || options.allowEmptyTranscript === true) && isEnglishScript(proposal.transcript);
  if (!proposal.displayReply?.trim() || !isEnglishScript(proposal.displayReply) || !validTranscript) {
    throw new ProviderError('AI output did not meet the English transcript requirement. No fields were changed; please try again.', 502, 'AI_LANGUAGE_INVALID');
  }
  for (const operation of proposal.operations) {
    const values = 'fields' in operation ? Object.values(operation.fields) : 'title' in operation ? [operation.title] : [];
    if (values.some(value => typeof value === 'string' && !isEnglishScript(value))) throw new ProviderError('AI returned quotation text outside English letters. No fields were changed; please try again.', 502, 'AI_LANGUAGE_INVALID');
  }
}
export function hasNonEnglishDraft(draft: VoiceDraft) {
  return [...Object.values(draft.project), ...draft.sections.flatMap(section => [section.title, ...section.items.flatMap(item => [item.productName, item.productDetails, item.side])])].some(value => !isEnglishScript(value));
}
