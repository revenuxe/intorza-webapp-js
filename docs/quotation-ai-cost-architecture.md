# Quotation voice cost architecture

The browser owns the quotation draft, the current guided field, and the review state. The live model only understands a spoken answer, provides a brief reply, and proposes a validated change. This prevents the model from calculating prices or rebuilding a quotation that the application can handle deterministically.

## Runtime flow

1. Start one short Realtime session when the user begins speaking.
2. Keep each assistant reply to one brief question or confirmation.
3. Validate and apply all quotation operations locally. Do not make a second model request for a form edit.
4. Close after 30 seconds of ordinary silence, 45 seconds while a user reviews a changed field, or two minutes total. Resume creates a short new session from the verified local draft.
5. Retain at most 1,200 post-instruction context tokens at 70% retention. The verified draft is injected again on a new session, so old chat history is unnecessary.

## Model allocation

Use `gpt-realtime-2.1-mini` for live speech. It is the existing low-cost Realtime model and is appropriate for the constrained field-by-field tool workflow. Use browser typing and local guided validation for predictable input. Reserve an OpenAI response only for voice interpretation, a user asking for an explanation, or a free-form correction.

## Guardrails

- 512 maximum output tokens per turn.
- Semantic voice activity detection prevents empty audio from creating responses.
- One language-repair retry only; failed output never mutates the quotation.
- Per-user rate limiting runs before a Realtime credential is created.
- Track Realtime session duration and successful completed quotations in the provider dashboard. Optimise cost per completed quotation rather than token count alone.
