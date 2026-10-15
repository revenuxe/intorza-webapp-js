# AI floor plan quotation builder

Implemented 2026-10-15. This replaces the quotation voice workflow. The voice UI,
microphone capture, WebRTC/live clients and speech/realtime/live routes are removed.
The existing text AI turn endpoint, audit data, auth, Worker and quotation editor remain.

## Deployment

1. Apply `supabase/migrations/20261015160000_floor_plan_quotation_builder.sql` using the
   existing reviewed Supabase migration process. It creates a private storage bucket,
   owner-scoped analysis/estimate records and approved selling rates. This migration
   was applied to the linked project on 2026-10-15 and verified with rollback-only
   owner/cross-user tests. See [the rollout record](./floor-plan-database-rollout-2026-10-15.md).
2. Keep `OPENAI_API_KEY` in Cloudflare runtime secrets. Set
   `OPENAI_FLOOR_PLAN_MODEL` to a vision-capable Responses model available to that
   API project, or use the existing `OPENAI_MODEL` fallback. No new model ID is hardcoded.
   A missing configuration produces a recoverable setup error. Account-specific model
   access and live document accuracy require a deployment smoke test.
3. Keep the existing `QUOTATION_AI_LIMITER` binding. Production requests fail closed
   if it is unavailable. Authentication uses the current Supabase bearer session;
   database/storage requests use that same user's JWT, never a service-role bypass.
4. `OPENAI_TTS_MODEL` and `OPENAI_REALTIME_MODEL` are no longer used by this workflow
   and may be removed from deployment variables. Do not delete secrets used elsewhere.

The existing Cloudflare/OpenNext Worker entry point is unchanged. The new route is
`POST /api/quotation-ai/floor-plan`; there is no WebSocket or audio session.

## Workflow and cost

A single Built with AI button opens a compact chooser with two side-by-side cards,
including on mobile. Each card launches an accessible, height-constrained workflow dialog. Uploads support
up to three PDF/JPEG/PNG/WEBP files with a combined 10 MB limit, drag/drop, previews,
removal and real upload progress. Multipart bodies are bounded while streaming;
server-side signatures are checked independently of browser MIME/extension. Encrypted
PDFs are rejected. The vision service also has to parse the actual document; unreadable
documents fail without publishing an estimate. This is not a malware scanning service.
No CAD upload formats are advertised.

Templates and Customize share a mobile row; the AI action has its own full-width row.
On larger screens all three actions share a row with a wider AI button. Custom SVG
plan/document illustrations and gold coins identify the two workflows. The requested
60-coin display and 15/10-credit labels are presentation values only: there is no wallet,
credit ledger, balance lookup or deduction. They must be connected to server-owned
accounting before being treated as spendable account credits. The upload screen keeps
tips collapsed, and room details can be expanded individually.

One vision request analyses the document(s), including PDF pages. Results preserve
room type, floor label, source file/page, printed dimensions converted to feet,
confidence and observations. Unscaled inferred dimensions are cleared. The user can
correct rooms and dimensions. Scope, finish, optional budget and client/location
questions run locally without model calls. The no-plan path collects rooms directly.
The catalogue context is capped at 60 candidates with shortened specifications; canonical
rates and full provenance remain on the server. No model call is made for each form field.

One structured text request proposes items. It cannot choose arbitrary prices or taxes.
The server resolves current approved rate references first, then researches missing
rates using OpenAI Responses web search, then uses labelled recent historical rates
where available. Product names must match referenced rates. Currency/location
filters apply. Unknown rates/quantities stay null and totals are explicitly partial.
Live research is implemented but account-specific access is not verified locally.
My Library → Items has an explicit approval panel; historic patterns are never
silently promoted to approved rates. Approved rates exclude GST; inclusions and verification
date are recorded. Deactivation preserves historical evidence.

### Empty-catalogue pricing

`market-pricing.ts` defines a research-provider interface and an OpenAI web-search
implementation, using the existing server-only key. Optional `OPENAI_MARKET_MODEL`
overrides the floor-plan/text model; it must support the Responses `web_search` tool.
`QUOTATION_MARKET_RESEARCH=openai` is the default; `disabled` stops live research.
No separate search credential or database migration is required. The implementation
follows https://developers.openai.com/api/docs/guides/tools-web-search .

One batch researches up to 12 deduplicated product descriptions, with at most four
search tool calls and a 45-second deadline. Research receives product specifications,
finish, currency and city, never client name/address or the entire quotation.
Only URLs present in completed search output can support a rate. Future,
older-than-90-day, different-city/currency, unknown/included-tax, material-only,
uninstalled, incompatible-unit and noncomparable rates are excluded. Square-metre
rates normalize to sqft. Source hosts are deduplicated; a spread exceeding 3× is
flagged rather than averaged. Otherwise the deterministic median of range midpoints
produces an indicative rate, retaining range, publication/retrieval dates, short source
excerpts and source links. A single usable source has low confidence. These are
`market_estimate` records, not verified supplier quotations. No implicit markup is added.
Undated retrieved pages can support low-confidence indicative estimates with an explicit
unknown-publication-date warning; retrieval is never represented as price verification.

Evidence is persisted in the existing owner-scoped plan estimate JSON and reused only
within that same project for 24h with identical product specifications/currency/city;
cache use is disclosed. New quotations request live research. Provider failures retain
pending prices and explicit limitations. Expired approved rates are excluded from
automatic selection after 90 days; reapprove them in My Library if still applicable.
Historical rates older than 90 days are not used automatically.

Preview/editor show pending amounts and provisional totals instead of zero for unknown
AI amounts. Source details appear under each item and restore from the linked plan
record after reopening. Changes to user-entered rates/quantities recalculate with the
existing fixed-point engine; provenance is explicitly the original AI evidence, not a
claim that edited values were externally verified. Full-room false ceiling coverage
can use printed/user-provided room width × length as an explicitly labelled allowance.
Cabinetry never receives floor area as a substitute for manufacturing dimensions.

Existing fixed-point quotation arithmetic computes all totals. Duplicate products
within a room and proposals outside the selected scope are rejected. All model work
measurements remain estimates requiring review, even when the model says measured.
Floor area is not automatically assigned to wardrobes or wall cabinetry.

The preview supports editing project details and regenerating selected rooms. Other
rooms survive regeneration; retained prices are re-resolved against current sources.
The original editor snapshot is checked before applying. Generated sections append
to existing content, preserving manual sections/items. Edit Quotation opens the current
editor; Save as Draft explicitly applies the reviewed estimate and invokes its normal
save flow after state has rendered. Saving links the analysis record to the quotation.
Finalizing a newly generated estimate requires complete client/title/item/measurement/rate
fields. Nothing is automatically sent.

## Current limits and next work

- The existing editor and PDFs bill in square feet. Running feet, pieces, sets and
  lump-sum rates can be catalogued but are excluded from generated editor totals.
  Metric profiles are rejected with an actionable message to avoid mislabelling sqft as sqm.
  Supporting them requires a coordinated editor/database/PDF billing-unit migration;
  this implementation never disguises those quantities as sqft.
- File checks enforce bounds and basic content signatures; there is no full antivirus
  or CAD conversion pipeline. No PDF page count is shown before analysis. Page-specific
  extraction is available in the analysis result.
- Generated provenance is saved in the owner-scoped plan project record. The normal
  quotation/PDF schema does not embed a complete immutable estimate snapshot. Reopening
  a linked quotation restores its review marker/completeness guard, but does not yet
  restore the builder preview automatically.
- Files and analysis remain in private owner storage. Add an explicit retention/deletion
  UI and scheduled cleanup policy before promising automatic retention limits.
- There is no automatic model training. Structured, tenant-scoped plans, briefs,
  rates and estimate provenance provide future evaluation/pricing-intelligence inputs.
  Historical data must be reviewed for specification, locality, date and discounts.

## Verification

Automated tests cover authenticated/expired sessions, rate limits, project isolation,
bounded and disguised uploads, private cleanup on failure, model result validation,
unknown/inferred measurements, scope and duplicate checks, canonical rates, deterministic
money calculations, selective regeneration, review before applying/saving, and answer
preservation on errors. Browser checks mock auth/storage/provider responses and exercise
320/390/768/1440 pixel layouts and the in-app flow. These do not establish physical iPhone
keyboard behavior, deployed storage policies, live provider access or drawing accuracy.

API format verified against official OpenAI documentation:
https://developers.openai.com/api/docs/guides/file-inputs
PDFs use Responses `input_file` data; images use `input_image`. Provider requests are
server-side, bounded by a deadline and use `store: false`.
