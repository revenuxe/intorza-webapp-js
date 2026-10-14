# Gemini + browser voice quotation assistant

Implemented foundation, 2026-10-14. This document supersedes provider/transport choices in `voice-quotation-plan.md`.

## Current OpenAI integration (2026-10-15)

This section supersedes all Gemini configuration below. The active provider is OpenAI, with `gpt-5.4-mini` as the configurable text default and `gpt-4o-mini-tts` for spoken playback. Gemini is disabled in the factory; `/api/quotation-ai/live` returns 410 and cannot issue Google tokens. Old Gemini source modules remain for historical reference/tests but are not used by the mounted quotation flow.

Cloudflare runtime configuration:

```dotenv
OPENAI_API_KEY=your-server-only-secret
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

The key is never public or returned to the browser. Existing `GEMINI_*` and `QUOTATION_AI_PROVIDER=gemini` overrides are ignored by the active endpoint. OpenAI usage requires API-project access/credit; it is not supplied by an unrelated subscription or a Gemini free tier. No credentials have been provisioned by this implementation.

The server calls the Responses API with strict JSON schema and `store:false`, a 30-second deadline, bounded output and at most one transient-5xx retry. Structured wire patches contain nullable unused fields; the adapter converts them into the existing domain command schema without wiping unspecified values. Authentication, per-user limits, batch validation, fixed-point calculations, optimistic form conflict checks, undo, incomplete draft handling and explicit saving remain intact. Unknown or noncompliant output is rejected before a form update. The operation schema includes `update_section` to translate existing section names without replacing their identities or items.

Language contract: `reply` and `clarification` are the spoken text in the selected Hindi/English language. `displayReply` is English. `transcript` is an English semantic translation of the latest user answer, with proper names in Roman letters. All operation text and section titles must use Latin letters; product/room words are translated to English rather than merely transliterated. Non-Latin output is rejected, never silently applied. Existing Hindi draft content triggers a visible Convert existing text to English action; the model must preserve numeric fields and IDs while changing text. If any Hindi quotation content survives an accepted turn, the whole change is rejected. Name spelling still requires user review; Latin-script enforcement cannot prove semantic translation accuracy.

Browser speech recognition still captures input. Before a model translation arrives, the visible interim/failed-turn transcript uses approximate Roman transliteration; the original recognized text is sent for extraction. Successful turns display the English translation. The interface stays English even when speech language is Hindi. Recognition errors still need user review.

`/api/quotation-ai/speech` authenticates, rate limits and bounds speech requests, calls OpenAI speech generation with the requested language and returns non-cacheable MP3. This removes reliance on an installed Hindi device voice. Playback finishes before microphone recognition restarts, and pause/hide/close aborts loading, releases audio URLs and ignores stale playback. A failed speech request leaves the English question visible and the assistant paused. The UI discloses AI-generated speech. No speech transcript/audio is logged by these endpoints.

Text and speech share the per-user request limiter; continuous use may hit that quota sooner than text-only use. No Realtime protocol or model training is claimed. Live latency, pronunciation and account access must still be verified after adding the runtime key and deploying.

Official sources: https://developers.openai.com/api/docs/guides/structured-outputs ; https://developers.openai.com/api/docs/models/gpt-5.4-mini ; https://developers.openai.com/api/docs/guides/text-to-speech

Current model update (2026-10-15): the mounted browser/text assistant defaults to `gemini-3.5-flash-lite`. Set Cloudflare runtime `GEMINI_MODEL=gemini-3.5-flash-lite` or remove an older runtime override. `.env.example` reflects this default. Automatic fallback to other models has been removed to preserve the user's model/cost preference; transient 5xx errors can retry the same model once. Google lists free-tier input/output for this model, subject to project tier and limits. Paid-tier projects have applicable charges, and changing a model does not automatically repair a depleted-credit HTTP 402 or change the Google project's billing tier. Source: https://ai.google.dev/gemini-api/docs/pricing . Earlier model/Live sections below are historical.

Update 2026-10-15: the quotation form currently uses the browser/text assistant with gemini-3.8-flash and gemini-3.6-flash fallback, following unsupported Live-model reports. The Live implementation below remains available in source but is not the mounted default. Spoken replies use the selected Hindi/English language; interface and displayed conversation use English/Latin letters. Gemini returns separate displayReply and transcript translations alongside its spoken reply. Recognized text uses display-only Roman transliteration before a model translation is available; original recognition is preserved for extraction. A final script guard transliterates noncompliant Hindi operation strings, including section titles. Transliteration is approximate, so proper-name spelling should be reviewed.

Google HTTP 402 is now reported as GEMINI_PAYMENT_REQUIRED with an actionable API-project billing message. It is not retried or model-fallbacked. The previously generic GEMINI_UPSTREAM_FAILED/402 response was a misleading classification, not evidence of a model outage. API billing must be resolved externally in the key's Google AI Studio project.

## Native Live voice (current default)

The form now mounts `QuotationVoiceAssistant`, which offers native Live voice by default and retains the earlier browser/text assistant as an explicit fallback. The conversational model is configurable separately using server-only `GEMINI_LIVE_MODEL`; the default is `gemini-3.8-live`, Google's documented current conversational Live model. The older label "Gemini 3 Flash Live" does not imply a verified API identifier of `gemini-3-flash-live`. `gemini-3.1-flash-live-preview` can be selected explicitly if the account supports it. No silent model fallback occurs.

Live Translate and Transcribe Live are not used for the quotation interview: translation is a different task, while transcription alone would still need a conversational model and speech generation. The existing text `GEMINI_MODEL` remains independent for the browser/text fallback. Quota counters are not treated as a promise of free usage.

`/api/quotation-ai/live` authenticates users and rate limits token creation and tool validation. It creates one-use, three-minute ephemeral credentials, with a one-minute window to open the session, constrained to the chosen model and server-created configuration. The permanent API key never leaves the server. The browser connects directly over the documented v1beta Live WebSocket using the short-lived access token. This avoids proxying live audio through ordinary Next.js requests or introducing an unmanaged server-side WebSocket.

`live-audio.ts` captures the actual microphone stream with requested echo cancellation, noise suppression, automatic gain control, and mono audio. An AudioWorklet packages audio into 1024-sample frames; the client converts it to signed little-endian 16kHz PCM and streams it to Gemini. Native voice activity detection uses conservative speech-start sensitivity and a 600ms silence endpoint. The client plays streamed PCM replies at the declared sample rate and flushes queued audio on interruption. Output is bounded to prevent runaway playback buffering; socket backpressure ends a degraded session rather than dropping arbitrary audio indefinitely. These controls reduce noise but do not establish speaker identity or guarantee acoustic isolation.

Live function calls expose only `get_quotation` and `apply_quotation`. Changes use the existing operation schema, server validation, integer calculations, current-draft revision checks and client form fingerprints. Tool responses include canonical state/totals; the model is instructed to wait for success before claiming an edit. Repeated call IDs execute once per session; canceled calls do not apply late responses. In noisy-surroundings mode, a readable proposed-change summary requires explicit acceptance. Undo pauses the session and refuses to overwrite manual edits.

Pause, mode switching, hidden tabs, sign-out, close, timeout and unmount stop tracks, close audio contexts/socket, abort HTTP requests and decline pending approvals. After disconnect, users explicitly start a fresh session from the current form; transparent session-resumption/reconnect is not claimed. Each session is capped at three minutes and credentials also expire. There is no cross-device AI-session persistence or new database write path. Actual live account access, token/schema compatibility, mobile audio behavior, latency and cost still require deployment testing with the account's runtime secret.

Runtime configuration:

```dotenv
GEMINI_API_KEY=your-server-secret
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_MODEL=gemini-3.8-flash
```

Live references: https://ai.google.dev/gemini-api/docs/models.md ; https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens ; https://ai.google.dev/api/live ; https://ai.google.dev/gemini-api/docs/live-api/tools

The following browser-recognition sections describe the retained fallback rather than the default Live path.

## Boundaries

1. `browser-speech.ts` implements `SpeechInputProvider` using `SpeechRecognition` or `webkitSpeechRecognition`. After the user starts a voice conversation, a finished answer is submitted automatically. Typed answers/corrections remain available while paused. Hindi and Indian English can be selected. Recognition availability and accuracy depend on the browser/device/service, including mixed-language recognition. Browser recognition may use a remote service; this is not an offline guarantee.
2. `VoiceQuotationAssistant.tsx` is a compact inline assistant above the existing form, without a modal or duplicate quotation preview. It speaks the question, listens after playback, populates validated fields, and asks the next question. It owns bounded recent conversation and ten-step undo. Closing or hiding the assistant stops capture. Closing aborts pending requests and ignores stale responses. Canceled playback callbacks are ignored using an audio generation counter.
3. `/api/quotation-ai/turn` verifies the Supabase bearer token, rate limits the user, limits request bodies to 64 KiB, validates the draft, and invokes a provider adapter. No quotation database mutation occurs in this endpoint.
4. `QuotationAIProvider` is a text interpretation boundary, independent of speech transport and financial calculations. `provider-factory.ts` selects the adapter. `GeminiQuotationProvider` uses Gemini's REST structured-output mode, server-only credentials, a shared 25-second deadline, bounded output, and one retry after 350 ms only for upstream 500/502/503/504. Key, model, validation, and quota failures are not automatically retried.
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

## Hindi and failure diagnostics update

## Turn-taking and latency update

Recognition uses continuous results with application-managed end-of-turn timing: 850 ms after a final result, extended to 1400 ms when unfinished interim text is present. Fifteen seconds without results stops capture. These are transcript-event heuristics, not audio VAD or a human-latency guarantee; tune them using device recordings. Results are keyed by recognition index to avoid duplicate text. All endpoint/rearm/idle timers are canceled on pause, hiding, and unmount. A 120 ms gap after playback reduces capturing the tail of the assistant's speech.

Conservative text rules ignore filler-only English/Hindi utterances and exact long question echoes. Short meaningful confirmations (yes/no/हाँ) are retained. At most two automatic re-listening attempts follow ignored nonempty turns, preventing endless background-noise loops. In noisy-surroundings mode, every recognized answer must be reviewed and explicitly sent. Low-confidence answers still pause automatically in normal mode.

Known Gemini 3 Flash models receive LOW thinking effort; unknown/older models receive no new thinking parameter. Prompts request short questions and no operations for unrelated dialogue. Success responses expose provider and total server durations through Server-Timing for measurement. The client still waits for a complete validated proposal before mutating fields; partially streamed JSON is never applied.

This implementation neither trains a speech model nor filters raw audio. Browser SpeechRecognition controls its own microphone processing; a parallel getUserMedia stream with noise-suppression settings would not necessarily process the audio used by recognition and is intentionally not presented as a fix. Background speakers giving plausible quotation numbers cannot reliably be distinguished from the user through text alone. Reliable speaker isolation, calibrated audio VAD, and barge-in need an audio pipeline with microphone-stream control and evaluation on consented English/Hindi recordings. No such audio data or training run is claimed here.

The assistant includes Hindi opening questions and controls, a saved language preference, and selection of an installed Hindi synthesis voice. When the device exposes voices but none in Hindi, the assistant shows a Hindi notice and retains text questions/recognition instead of deliberately choosing an English voice. Browser confidence between 0 and 0.6 pauses submission for transcript review; absent/zero confidence is treated as unknown, never as proof of correctness. This heuristic needs calibration on actual device recordings.

Gemini receives language-specific Hindi/Hinglish instructions and examples for fractions, feet/inches, Indian number phrases, total versus rate, corrections, and confirmations. Devanagari digits are normalized without altering names or number-word meanings. This is prompt guidance, not model fine-tuning or a claim of perfect transcription.

Provider failures now return a stable `code`, `requestId`, and, for upstream HTTP errors, `upstreamStatus`. The UI displays the code/reference, and Worker logs record only these diagnostic fields. Raw provider messages, transcripts, authorization headers, and keys are not logged. `GEMINI_UPSTREAM_FAILED` with status 503 indicates exhausted transient retries; `GEMINI_OUTPUT_INVALID` or `QUOTATION_CHANGE_INVALID` identifies output/domain validation rather than network failure. Missing runtime credentials remain a configuration error. Headers alone cannot establish which condition caused a particular 502.

For troubleshooting, copy only the JSON Response tab and the non-secret runtime `GEMINI_MODEL` value. Do not share Authorization headers or API keys.

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/api/generate-content
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
