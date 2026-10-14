import 'server-only';
import { OpenAIQuotationProvider } from './openai';
import { ProviderError, type QuotationAIProvider } from './provider';

export type ProviderConfiguration = { provider: string; apiKey?: string; model: string };
export function createQuotationProvider(config: ProviderConfiguration): QuotationAIProvider {
  if (config.provider !== 'openai') throw new ProviderError('Gemini is disabled. Configure OpenAI for quotation creation.', 503, 'AI_PROVIDER_DISABLED');
  if (!config.apiKey) throw new ProviderError('Configure OPENAI_API_KEY as a Cloudflare runtime secret.', 503, 'OPENAI_KEY_MISSING');
  return new OpenAIQuotationProvider(config.apiKey, config.model);
}
