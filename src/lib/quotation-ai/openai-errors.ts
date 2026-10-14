import { ProviderError } from './provider';
const billingCodes = new Set(['insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active', 'organization_usage_limit_exceeded', 'usage_limit_reached', 'credits_exhausted']);
const rateCodes = new Set(['rate_limit_exceeded', 'slow_down', 'rate_limit_error']);
export async function openAIError(response: Response): Promise<ProviderError> {
  const body = await response.json().catch(() => null);
  const code = typeof body?.error?.code === 'string' && /^[a-z_]{1,80}$/.test(body.error.code) ? body.error.code : undefined;
  const type = typeof body?.error?.type === 'string' ? body.error.type : undefined;
  const quota = type === 'insufficient_quota' || (code && billingCodes.has(code));
  const rate = !quota && response.status === 429 && (type === 'rate_limit_error' || (code && rateCodes.has(code)));
  const error = new ProviderError(
    quota ? 'OpenAI API quota or billing limit is exhausted. Check API credit, billing status and project/organization spending limits. Waiting or changing models will not restore credit.'
      : rate ? 'OpenAI rate limit reached for this API project/model. Wait before sending another answer; check the project request/token limits if this happens on the first request.'
      : response.status === 429 ? 'OpenAI rejected this request with HTTP 429. Check API project billing and model limits; the provider did not identify a temporary rate limit.'
      : response.status === 401 || response.status === 403 ? 'OpenAI rejected the runtime API key or project permissions.'
      : response.status === 400 || response.status === 404 ? 'OpenAI rejected the configured model or request. Check OPENAI_MODEL and project access.'
      : 'OpenAI is temporarily unavailable. Your fields are unchanged.',
    response.status === 429 ? 429 : 502,
    quota ? 'OPENAI_QUOTA_EXHAUSTED' : rate ? 'OPENAI_RATE_LIMITED' : `OPENAI_HTTP_${response.status}`, response.status,
  );
  error.providerCode = code;
  const requestId = response.headers.get('x-request-id');
  if (requestId && /^[a-zA-Z0-9_-]{1,150}$/.test(requestId)) error.providerRequestId = requestId;
  // Only temporary rate limits are eligible for Retry-After. Quota failures need account action.
  if (rate) {
    const retry = response.headers.get('retry-after');
    const seconds = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000) : 60;
    error.retryAfterSeconds = Number.isFinite(seconds) ? Math.min(3600, Math.max(1, Math.ceil(seconds))) : 60;
  }
  return error;
}
