# Conversational voice quotation architecture

Date: 2026-10-14. Status: historical architecture and future roadmap. The implemented Gemini Flash + browser speech recognition design is documented in [quotation-ai-implementation.md](./quotation-ai-implementation.md); it supersedes the provider/transport recommendations below. Database snapshot and persistence proposals below remain future work.

## Recommendation

Build one conversational assistant over a shared, validated quotation domain. Updated user priority: high accuracy at very low cost. Start with a turn-based speech-to-text / structured text reasoning / speech playback pipeline and authenticated application endpoints for quotation operations. Keep a typed fallback. Realtime WebRTC is a later premium experience; the Realtime transport design below is an alternative, not the initial implementation.

Initial candidates: `gpt-4o-mini-transcribe` for ordinary speech and `gpt-5.4-mini` for structured extraction and questions. Benchmark transcription against `gpt-4o-transcribe` using real English/Hinglish quotation recordings before selecting production defaults. On ambiguous numeric speech, request clarification; optionally re-transcribe the current utterance with the stronger candidate, but do not treat agreement as proof. Browser speech synthesis is a proposed no-provider-TTS-charge option where suitable voices exist; retain visible questions and use paid TTS only if device voice quality fails the pilot. This approach has a pause between turns and does not promise full-duplex conversation.

Verified listed estimates: mini transcription USD 0.003/audio minute; full transcription USD 0.006/audio minute. GPT-5.4 Mini text rates: USD 0.75/million input tokens and USD 4.50/million output tokens. Example per quotation with 5 minutes of user audio, 15,000 total billed input tokens across all turns, and 2,000 total billed output tokens: USD 0.03525 with mini transcription or USD 0.05025 with full transcription. Excludes paid TTS, hosting, taxes, retries, and extra reasoning tokens outside that output allowance. These are illustrative usage assumptions, not measured production costs or an accuracy ranking. Sources: official pricing and GPT-5.4 Mini model pages, checked 2026-10-14.

Cost controls: send a concise canonical draft and recent relevant turns rather than the entire growing transcript; use deterministic next-field questions where appropriate; avoid billable silence; cap retries and output length; cache reusable spoken prompts where licensing/provider terms allow. Confirm dimensions, rate, and billing basis together before accepting each item. Target field correctness and cost per completed quotation in pilot evaluations.

AI interprets and asks questions. Domain code owns measurement conversion, pricing, validation, revisions, and persistence. The assistant must only describe changes and totals returned by successful tools. No direct model writes to database tables or generated PDFs.

## Evidence from this repository

- `src/views/CreateQuotation.tsx`: quotation metadata, sections, items, images, pricing, payment stages, preview, and save currently live together in a large client component.
- Items have `side`, `productName`, `productDetails`, `widthFt`, `heightFt`, `sftArea`, `ratePerSft`, and `amount`. No explicit billing mode or quantity exists in this interface.
- Changing dimensions recalculates area; users can also enter area directly. The draft does not record which measurement mode was intended.
- Subtotal is the sum of item amounts. The social media discount replaces the ordinary percentage discount when enabled. Tax is calculated on the discounted subtotal.
- Pending pricing settings and `appliedPricing` are intentionally separate. Voice must preserve this distinction.
- The current save handler requires client name and quotation title, but missing numeric values are converted to zero. A zero is therefore not proof that a user explicitly supplied a zero price.
- `src/lib/api.ts` uses the authenticated `save_quotation` RPC for atomic quotation saves.
- `supabase/migrations/20261013200000_atomic_quotation_save.sql` scopes updates to the owner and saves sections/items/images transactionally. It accepts payload totals and item amounts rather than deriving them from the measurements/rates.
- `src/hooks/useQuotationAutomation.tsx` already loads clients, preferences, and product usage patterns. Reuse these as suggestions with provenance, not silently accepted prices.
- Terms, payment stages, bank details, and profile settings feed document generation. The inspected quotation save payload does not include payment stages or terms. Define immutable quote snapshots before offering voice edits to these fields.
- Next.js is deployed through OpenNext on Cloudflare; Supabase handles auth and data. There is no existing voice backend in the inspected paths.

## Experience and conversation policy

Desktop: conversation panel beside the quotation preview. Mobile: full-height sheet with Conversation and Quote tabs, sticky microphone/mute/end controls, and a visible total plus unresolved-field count. Text entry and manual editing remain available throughout.

Opening: "Tell me who the quotation is for and the work you want to include. You can give the details together, or we can go step by step."

Capture all facts in a user's turn; ask only for missing or ambiguous facts. Ask one focused question at a time, with short replies. Do not repeat fields already confirmed. An experienced user can dictate several items at once; a new user can answer item by item.

Recommended progression:

1. Identify client and project; disambiguate matching clients.
2. Identify section/room and product, then specifications that affect its price.
3. Ask for direct area or width and height; establish units.
4. Ask for rate and billing basis; offer a historical rate only with its source and user acceptance.
5. Read back a compact item summary, including area, rate basis, and calculated amount.
6. Ask for the next item. Support moving between sections and correcting earlier items.
7. Review discount and tax settings, explicitly applying pending pricing changes.
8. Review validity, deadline, warranty, payment stages, and terms; offer existing defaults as a single reviewable summary.
9. Show itemized review, resolve blockers, and offer Save draft or the existing finalization flow.

Support commands such as "change the wardrobe height to seven feet", "same rate for the next item", "undo that", "skip the address", and "review everything". Resolve references against stable item IDs. If two wardrobes match, ask which one. "Same" copies only the explicitly intended fields.

English and Hindi/Hinglish are proposed initial languages, subject to testing with actual users. Preserve product names and numbers through language changes. Store a preferred language but let users switch. Do not treat transcription as guaranteed word-for-word evidence of audio interpretation.

## Measurement and pricing rules

- Distinguish `missing`, `suggested`, `provided`, and `confirmed`; represent missing numbers as null, never zero.
- Measurement mode is `dimensions` or `direct_area`. A user can quote 42 sq ft without invented width and height.
- Preserve original spoken measurement and normalized numeric value. Convert feet/inches deterministically: 6 ft 6 in = 6.5 ft. Ask whether "six point six" means decimal feet if context leaves this unclear.
- "Eight by seven" requires a known unit; otherwise ask. "Twelve hundred" must be associated with a field and billing basis.
- Distinguish room floor area from chargeable wardrobe/shutter surface area. Ask which the stated square footage represents.
- If supplied area conflicts with dimensions, ask which should control. Changing billing mode explicitly clears or supersedes conflicting inputs.
- MVP supports the existing square-foot rate model. Running-foot, per-piece, quantity, and lump-sum pricing require explicit schema/UI/PDF migrations before activation. Never disguise a lump sum as a fake square-foot rate.
- Use decimal arithmetic and a documented currency rounding policy shared by previews, saves, and PDFs. Round at defined stages; allocate payment rounding residuals deterministically.
- Reproduce existing discount precedence unless a separate product change is approved. Do not silently stack social and normal discounts.
- Tax values come from user/company settings and confirmation. Do not invent tax treatment from the user's location.
- Allow incomplete drafts; block finalization on missing billable area/rate, unresolved ambiguity, invalid percentages, or conflicting values. A zero-price item must be explicitly marked intentional.

Illustrative arithmetic: 8 ft x 7 ft = 56 sq ft; at INR 1,200/sq ft the amount is INR 67,200. With a 5% discount and user-selected 18% tax, discount = INR 3,360; taxable amount = INR 63,840; tax = INR 11,491.20; total = INR 75,331.20. These are example settings, not recommended tax treatment.

## Architecture and state ownership

Browser audio connects to the voice provider using WebRTC. The authenticated backend creates a bounded session; long-lived provider credentials stay in server secrets. Backend endpoints validate every tool operation independently of voice-session configuration.

Start with client-relayed function calls to authenticated HTTP endpoints to fit the existing request-oriented deployment. Relay only allowlisted typed operations. The server verifies user, session ownership, draft ownership, item scope, revision, and limits; never trust IDs or values merely because a model supplied them. Tool output is sent back to the voice session, and returned authoritative state updates the UI.

If server-side session control is required, add a dedicated lifecycle-managed connection using an appropriate Cloudflare Durable Object/Worker design or a persistent service. Prototype deployment behavior before selecting it. Do not attach an unmanaged long-lived WebSocket to an ordinary Next.js request and assume it survives.

The authoritative state is a versioned quotation draft. Transcript and provider conversation state are supplementary. Manual and voice changes run through the same reducer/command service. Do not synchronize two independent form stores through unrelated setters.

Suggested domain modules:

- `src/lib/quotation/schema.ts`: typed draft, fields, commands, and validation with Zod.
- `src/lib/quotation/measurements.ts`: parsing/conversion and measurement mode rules.
- `src/lib/quotation/pricing.ts`: deterministic decimal calculations.
- `src/lib/quotation/commands.ts`: allowlisted mutations and revision rules.
- `src/lib/quotation/completeness.ts`: missing fields and prioritized question reasons.
- `src/hooks/useQuotationDraft.ts`: shared form/voice state adapter.
- `src/components/quotation/VoiceQuotationAssistant.tsx` and `useVoiceQuotation.ts`: responsive session UI and transport lifecycle.
- `src/app/api/quotation-ai/sessions/route.ts`: authenticated session setup.
- `src/app/api/quotation-ai/commands/route.ts`: authenticated tool dispatch.
- `src/app/api/quotation-ai/drafts/[id]/route.ts`: recovery and synchronization.

Proposed tools: `get_draft`, `find_clients`, `find_product_defaults`, `update_project`, `add_section`, `add_item`, `update_item`, `remove_item`, `propose_pricing`, `apply_pricing`, `get_missing_fields`, `get_review`, and `undo_command`. Expose only the tools needed in the current stage. Use domain-specific commands rather than arbitrary JSON paths, SQL, or free-form database mutations.

Each command carries `sessionId`, `draftId`, `expectedRevision`, `commandId`, an allowlisted operation, and validated arguments. Server responses include accepted changes, new revision, totals, unresolved fields, and the next question reason. Replay of a command ID returns its prior result. Revision conflicts trigger refresh/reconciliation, never blind overwrites. Validate a multi-item utterance as a batch before applying it.

Schema-constrained extraction helps enforce output shape; it does not establish that a price, unit, or item reference is correct. Apply semantic validation and user clarification separately. Do not rely on arbitrary model confidence scores; use explicit ambiguity/conflict rules and confirmation status.

## Persistence and document consistency

Add owner-scoped `quotation_ai_sessions`, `quotation_ai_drafts`, and `quotation_ai_events` tables with RLS. A draft stores the schema version, canonical payload, revision, calculation-policy version, and status. Session records reference the draft and store expiry/usage/status. Events store command IDs, revisions, and minimal before/after changes for bounded undo and diagnostics.

Separate draft recovery persistence from creating a formal quotation number. Autosave accepted changes with revision checks. On completion, adapt the validated draft to the existing `save_quotation` API and snapshot the document inputs. Include an idempotency token so a timed-out create cannot generate duplicate quotations.

Harden the database save boundary for all callers: validate required fields for the requested status and recalculate or independently verify financial fields. Backend-only recalculation is insufficient while clients can still call the RPC directly. Preserve atomic sections/items/images behavior.

Persist quote-specific payment stages, terms, applicable profile/document settings, currency, and calculation version. Editing company defaults later must not change a previously finalized quote. Any finalization confirmation is tied to a specific draft revision; later changes invalidate that confirmation.

Do not give the assistant a send/share tool in the first release. It prepares a reviewable quotation; existing explicit user controls handle saving/finalizing/sharing. Read-only preview is always available.

## Reliability, privacy, and operating limits

- Handle microphone denial, unsupported capture, audio playback restrictions, noisy environments, interruptions, disconnects, and background/resume. Pause capture when leaving the assistant; stop media tracks on end/unmount.
- Ignore stale callbacks after reconnect. Cancel spoken responses when interrupted and ensure canceled turns cannot apply outdated edits. Persist command results independently of whether spoken playback completes.
- Recover from the persisted draft and concise confirmed-state summary, not transcript replay. Display whether the last change was saved.
- Authenticate before starting paid sessions; rate-limit creation and commands; cap duration, idle time, simultaneous sessions, and per-user usage. Enforce limits server-side.
- Load only relevant tenant-scoped clients/products. Keep bank credentials and unrelated customer data out of model context. Treat retrieved product descriptions and transcript content as data, never privileged instructions.
- Proposed default: no application storage of raw recordings. Minimize/redact transcripts and use a defined retention policy for diagnostic events. Separately verify provider retention/account controls before launch.
- Log timing, command failures, revisions, and usage without unrestricted sensitive transcripts. Keep credentials out of the browser, logs, and public environment variables.

## Delivery sequence and acceptance gates

1. Domain foundation: extract shared schema/reducer/calculator; nullable inputs, measurement modes, decimal policy, and status-based validation. Verify existing manual entry and PDFs retain intended behavior.
2. Persistence: versioned recovery drafts, RLS, idempotent commands, optimistic concurrency, authoritative financial validation, and document snapshots. Verify duplicate retries, rollback, ownership, and resume behavior.
3. Text conversation: implement the same interview/tools in a typed interface before audio. Verify multi-item extraction, targeted corrections, missing-field selection, and that historical rates are only suggestions.
4. Voice integration: session endpoint, WebRTC transport, tool relay, interruption handling, responsive panel, and typed fallback. Evaluate actual Android Chrome, iPhone Safari, and desktop Chrome/Edge.
5. Pilot and rollout: feature flag, small opt-in cohort, usage dashboard, spending ceilings, prompt/version tracking, and rollback switch. Compare transports/models on real quotation conversations before fixing a production model version.

Release tests must include feet/inches versus decimal feet, direct area, conflicting measurements, rate versus total, ambiguous item references, several items in one utterance, discount precedence, pending versus applied pricing, manual edits during voice turns, repeated commands, lost response after save, cross-user access, reconnect, expired session, and company defaults changing after finalization.

Proposed quality gates: exact expected arithmetic for all deterministic fixtures; no invented required prices/measurements in the evaluated conversations; no duplicate mutations under retries; no cross-tenant access in authorization tests; saved snapshot and PDF totals agree. For voice, measure field-level accuracy and clarification success separately from transcript accuracy. A provisional latency target is first useful response within 2 seconds at p95 after end of speech on the chosen test network; benchmark rather than promise this.

Track completion rate, correction rate per field, clarification count, time to reviewed draft, save/recovery failures, and actual cost per completed quotation. Choose model and session budgets using measured audio/token usage; no cost estimate is claimed in this plan.

## Official documentation used

- Voice architecture choices: https://developers.openai.com/api/docs/guides/voice-agents
- Browser WebRTC connection: https://developers.openai.com/api/docs/guides/voice-webrtc
- Server controls and tool relay/sideband options: https://developers.openai.com/api/docs/guides/voice-server-controls?api=realtime&voice-api=realtime
- Structured outputs and tool schemas: https://developers.openai.com/api/docs/guides/structured-outputs
- Pricing: https://developers.openai.com/api/docs/pricing
- Text model candidate: https://developers.openai.com/api/docs/models/gpt-5.4-mini

Open implementation decisions: launch languages, catalog/billing modes beyond sq ft, exact rounding policy, transcript retention period, per-user budget, provider/model benchmarking, and whether finalization may ever be confirmed solely by voice. Initial defaults: existing sq-ft billing, explicit on-screen finalization, English/Hinglish pilot, and no raw recording storage.
