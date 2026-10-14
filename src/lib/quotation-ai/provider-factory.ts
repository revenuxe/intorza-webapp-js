import 'server-only';
import { GeminiQuotationProvider } from './gemini';
import { ProviderError, type QuotationAIProvider } from './provider';

export type ProviderConfiguration = { provider: string; apiKey?: string; model: string };
export function createQuotationProvider(config: ProviderConfiguration): QuotationAIProvider {
  if (config.provider !== 'gemini') throw new ProviderError('The configured AI provider is not supported.', 503);
  if (!config.apiKey) throw new ProviderError('Create with AI needs a Gemini API key configured on the server.', 503);
  return new GeminiQuotationProvider(config.apiKey, config.model);
}
