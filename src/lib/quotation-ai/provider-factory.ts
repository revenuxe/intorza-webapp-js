import 'server-only';
import { OpenAIQuotationProvider } from './openai';
import { MetaQuotationProvider } from './meta';
import { ProviderError, type QuotationAIProvider } from './provider';

export type ProviderConfiguration = { provider: string; apiKey?: string; model: string; baseUrl?: string; fallback?: { apiKey?: string; model: string } };
class FallbackProvider implements QuotationAIProvider {
  constructor(private primary: QuotationAIProvider, private fallback?: QuotationAIProvider) {}
  async propose(input: Parameters<QuotationAIProvider['propose']>[0], signal?: AbortSignal) {
    try { return await this.primary.propose(input, signal); } catch (error) { if (!this.fallback || signal?.aborted) throw error; return this.fallback.propose(input, signal); }
  }
}
export function createQuotationProvider(config: ProviderConfiguration): QuotationAIProvider {
  if (config.provider === 'meta') {
    if (!config.apiKey || !config.baseUrl) throw new ProviderError('Configure MODEL_API_KEY and META_BASE_URL as Cloudflare runtime secrets.', 503, 'META_KEY_MISSING');
    const fallback = config.fallback?.apiKey ? new OpenAIQuotationProvider(config.fallback.apiKey, config.fallback.model) : undefined;
    return new FallbackProvider(new MetaQuotationProvider(config.apiKey, config.model, config.baseUrl), fallback);
  }
  if (config.provider === 'openai') {
    if (!config.apiKey) throw new ProviderError('Configure OPENAI_API_KEY as a Cloudflare runtime secret.', 503, 'OPENAI_KEY_MISSING');
    return new OpenAIQuotationProvider(config.apiKey, config.model);
  }
  throw new ProviderError('Unsupported quotation AI provider.', 503, 'AI_PROVIDER_DISABLED');
}
