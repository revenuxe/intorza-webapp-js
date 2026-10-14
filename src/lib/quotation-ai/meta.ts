import 'server-only';
import { openAIResponseSchema, instructions, parseOpenAIProposal } from './openai';
import { ProviderError, type QuotationAIProvider } from './provider';

// Meta Model API exposes an OpenAI-compatible Chat Completions endpoint. The
// response schema keeps quotation mutations deterministic and provider-neutral.
export class MetaQuotationProvider implements QuotationAIProvider {
  constructor(private key: string, private model: string, private baseUrl: string) {}
  async propose(input: Parameters<QuotationAIProvider['propose']>[0], signal?: AbortSignal) {
    const deadline = signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal: deadline, headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'system', content: instructions }, { role: 'user', content: JSON.stringify(input) }],
          response_format: { type: 'json_schema', json_schema: { name: 'quotation_turn', strict: true, schema: openAIResponseSchema } },
        }),
      });
      if (!response.ok) throw new ProviderError('Meta could not process the quotation. OpenAI fallback will be used.', response.status >= 400 && response.status < 500 ? response.status : 502, 'META_UPSTREAM_FAILED', response.status);
      const body = await response.json();
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Missing structured response');
      return parseOpenAIProposal(JSON.parse(content));
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError('Meta could not process the quotation. OpenAI fallback will be used.', 502, 'META_UPSTREAM_FAILED');
    }
  }
}
