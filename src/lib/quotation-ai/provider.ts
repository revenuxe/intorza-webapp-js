import type { Proposal, VoiceDraft } from './domain';

export type ConversationTurn = { role: 'user' | 'assistant'; text: string };
export interface QuotationAIProvider {
  propose(input: { draft: VoiceDraft; message: string; history: ConversationTurn[]; language: string }, signal?: AbortSignal): Promise<Proposal>;
}

export class ProviderError extends Error {
  constructor(message: string, public status = 502, public code = 'AI_PROVIDER_ERROR', public upstreamStatus?: number) { super(message); }
}
