# Gemini + browser voice quotation assistant

Implemented foundation, 2026-10-14. This document supersedes provider/transport choices in `voice-quotation-plan.md`.

## Boundaries

1. `browser-speech.ts` implements `SpeechInputProvider` using `SpeechRecognition` or `webkitSpeechRecognition`. After the user starts a voice conversation, a finished answer is submitted automatically. Typed answers/corrections remain available while paused. Hindi and Indian English can be selected. Recognition availability and accuracy depend on the browser/device/service, including mixed-language recognition. Browser recognition may use a remote service; this is not an offline guarantee.
2. `VoiceQuotationAssistant.tsx` is a compact inline assistant above the existing form, without a modal or duplicate quotation preview. It speaks the question, listens after playback, populates validated fields, and asks the next question. It owns bounded recent conversation and ten-step undo. Closing or hiding the assistant stops capture. Closing aborts pending requests and ignores stale responses. Canceled playback callbacks are ignored using an audio generation counter.
3. `/api/quotation-ai/turn` verifies the Supabase bearer token, rate limits the user, limits request bodies to 64 KiB, validates the draft, and invokes a provider adapter. No quotation database mutation occurs in this endpoint.
4. `QuotationAIProvider` is a text interpretation boundary, independent of speech transport and financial calculations. `provider-factory.ts` selects the adapter. `GeminiQuotationProvider` uses Gemini's REST structured-output mode, server-only credentials, a 25-second timeout, bounded output, and no automatic retries.
5. `domain.ts` validates allowlisted operations with Zod, applies a complete batch to a cloned draft, and rejects stale references, conflicting measurement modes, duplicates, invalid numeric values, and item limits. A clarification discards all proposed changes for that turn. Missing numbers remain null; explicitly free rates may be zero.
6. The application calculates amounts using fixed-point integer arithmetic. Area/dimensions have four decimal places, rates and money two, with half-up rounding at line, discount, and tax stages. Social media discounts retain the existing precedence over ordinary discounts. The manual form uses the shared line and total helpers.
7. Each accepted answer immediately projects even an incomplete draft into the real quotation fields. Null measurements appear as blank numeric fields, with zero calculated amount until sufficient data exists; nullable metadata stays in the voice session. The assistant compares the current relevant form snapshot before applying a response and rejects it if manual edits occurred during the request. The next request rebases on manual edits. Undo also checks its expected snapshot and refuses to overwrite manual changes. Stable IDs preserve gallery associations. Pricing remains pending until Apply pricing. Quotations populated by voice cannot finalize with missing billable details; incomplete draft saves remain available.

## Configuration

Server-only environment variables:

```dotenv
QUOTATION_AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=your-server-key
```

The default model follows the current Gemini structured-output documentation; select an available Flash model for your account through `GEMINI_MODEL`. No model fallback occurs silently. Confirm structured-output compatibility when changing models. Local development uses `.env.local`; never expose the key through `NEXT_PUBLIC_` or browser code.

For Cloudflare deployment, provision `GEMINI_API_KEY` as a Worker secret, for example using `npx wrangler secret put GEMINI_API_KEY`. Optional provider/model values can be server environment variables or Worker configuration values. No secret is committed or provisioned by this change.

`wrangler.jsonc` adds `QUOTATION_AI_LIMITER` at 10 requests per minute per authenticated user. The existing app limiter also applies at the edge. The route fails closed in production if the distributed binding is absent. Local development uses a process-local equivalent. A per-minute limiter is not a monthly spending cap: configure Gemini project quotas/budgets before deployment.

## Provider replacement

Implement `QuotationAIProvider.propose` returning the same `Proposal` contract, validate the output with `proposalSchema`, and register the adapter in `provider-factory.ts`. The speech adapter, quotation operations, calculations, and UI do not need provider-specific changes. To replace speech recognition, supply a `SpeechInputProvider` to the assistant or add a new speech hook for a transport with different lifecycle requirements. Browser playback is optional and separate from AI interpretation.

## Privacy and recovery

The application sends transcript text, relevant quotation draft fields, and at most eight recent turns to Gemini. It does not send raw audio to Gemini or store raw audio itself. The browser's speech provider may receive audio. The server does not log prompts or provider response bodies. No bank details or unrelated client catalog is sent.

There is no separate recoverable AI draft or stored transcript. Closing the assistant leaves populated fields in the current quotation form; reopening starts from those fields. Save draft uses the normal application persistence flow. Reload recovery without saving and cross-device conversation recovery are outside this initial scope. Observed sign-out closes the assistant.

## Deliberate initial scope and follow-up work

- Square-foot billing, project/client text, sections, product details, measurements, rates, discounts, and tax are conversational. Dates, warranty, terms, payment stages, and images stay in the existing form/editor.
- New section creation uses an operation with a generated application ID. Items targeting that new section are added in a subsequent turn. This avoids model-generated trusted IDs; multiple explicit items in an existing section can be batched.
- User review confirms numeric interpretation. JSON schema and code validation do not prove that speech recognition or semantic extraction is correct. Product/measurement ambiguities still require clarification.
- Recovery is local; no AI session migrations or distributed draft persistence were introduced. Formal save retains the existing atomic RPC. Database-side recalculation/validation and immutable document snapshots remain separate follow-up work from the earlier plan.
- No fine-tuning, embeddings, paid transcription, external retrieval, or paid TTS is required. Gemini usage still incurs the account's applicable charges. Cost/latency/accuracy have not been measured against live Gemini.
- Benchmark actual English/Hindi/Hinglish quotation recordings and real mobile devices before production rollout. Unsupported speech environments retain typed input.

## Verification

Automated tests cover exact arithmetic, missing/free rates, direct area and partial dimensions, social discount precedence, stale/invalid batch rejection, legacy identifiers, authentication, request limits, clarification immutability, upstream invalid/truncated/quota responses, inline field population, undo, concurrent manual-edit protection, automatic voice submission, microphone cleanup, and canceled playback callbacks.

Official references:

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/api/generate-content
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
