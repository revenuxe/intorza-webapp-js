/** @jest-environment node */
import { openAIError } from './openai-errors';
describe('OpenAI 429 diagnostics', () => {
  it.each(['insufficient_quota','billing_hard_limit_reached','organization_usage_limit_exceeded'])('identifies %s as an account action, not a retryable rate limit', async code => {
    const error = await openAIError(new Response(JSON.stringify({ error: { code, type: 'insufficient_quota', message: 'private text' } }), { status:429, headers:{ 'Retry-After':'2' } }));
    expect(error.code).toBe('OPENAI_QUOTA_EXHAUSTED'); expect(error.providerCode).toBe(code); expect(error.retryAfterSeconds).toBeUndefined(); expect(error.message).not.toContain('private text');
  });
  it('handles a quota type even when code is missing', async () => {
    expect((await openAIError(new Response(JSON.stringify({ error: { type:'insufficient_quota' } }), { status:429 }))).code).toBe('OPENAI_QUOTA_EXHAUSTED');
  });
  it('preserves bounded Retry-After and upstream request ID for temporary limits', async () => {
    const error = await openAIError(new Response(JSON.stringify({ error: { code:'rate_limit_exceeded', type:'rate_limit_error' } }), { status:429, headers:{ 'Retry-After':'3.2','x-request-id':'req_safe123' } }));
    expect(error.code).toBe('OPENAI_RATE_LIMITED'); expect(error.retryAfterSeconds).toBe(4); expect(error.providerRequestId).toBe('req_safe123');
  });
  it('does not assume unknown 429s will resolve by waiting', async () => {
    const error = await openAIError(new Response('{}', { status:429 }));
    expect(error.code).toBe('OPENAI_HTTP_429'); expect(error.retryAfterSeconds).toBeUndefined(); expect(error.message).toContain('billing and model limits');
  });
});
