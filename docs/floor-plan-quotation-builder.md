# AI floor plan quotation builder

## Simplified upload path

Before generation, the upload path now asks which measurement input unit to use:
Feet, Sqft, Metres or Square metres. The preference is persisted in the project
brief and controls completion inputs; drawing dimensions keep their extracted
units and are normalized by analysis independently. Feet/metres require two
work dimensions, while sqft/sqm accept direct work coverage. All entered areas
normalize to sqft (1 sqm = 10.7639104167 sqft), with rates explicitly per sqft.
This is an input-unit selector, not support for running-foot/piece billing.
Generated work, the AI editor and its PDF use direct area with no width/height
columns. Missing cabinet/wall coverage remains pending instead of borrowing
room floor area. Legacy dimension-completion requests still convert to sqft.
Validation includes unit conversions, rejected single lengths, selected-unit
completion, PDF column checks and an upload/edit/save/reload browser run.

Generation automatically updates a metric profile to imperial through the
authenticated owner's profile permissions before pricing. The response syncs
the editor's measurement labels, and the preview confirms that the setting was
switched. Plan extraction already converts printed metric dimensions to feet;
this change does not reinterpret existing numeric quotation fields or change
currency. Saving the setting must succeed before generation proceeds.
The scope screen explains the automatic square-foot billing choice.
Validated with 25 API/UI tests, TypeScript and scoped ESLint.

Detail-based price fallback now compares product-name tokens and specification
overlap against recent, compatible admin reference prices. Conflicting core
materials, finishes, thicknesses and cabinet types are rejected. Ambiguous
near-ties with materially different specifications or rates remain pending.
An acceptable close match reuses its observed median unchanged, records the
reference product/specification and assumptions, and displays a low-confidence
close-match label. It is tried after exact/reference and market pricing.
All remaining market-research products are processed in batches of 12, rather
than silently skipping products after the first batch. Same-name products with
different specifications have independent research/cache/evidence groups.
Unsupported prices retain their rows with explicit per-item review reasons.
Validation: 43 targeted pricing/API tests, TypeScript and scoped ESLint.

The floor-plan upload path now goes directly from analysis to a compact scope
screen, defaulting to Full interior. Generate Quotation skips property review,
per-room yes/no questions, design, finish, budget and client questionnaires.
Kitchen, Bedrooms and selected rooms remain available. City is optional and
existing editor details are reused; missing client details can be entered in
the editor before saving. Unknown city does not borrow another city's prices.
The no-plan entry retains the guided questions.

Automatic generation keeps AI-proposed room work and supplements missing
essential room-specific fields. It uses the existing reviewed admin reference,
owner-approved rate and market pricing pipeline. Missing dimensions/rates stay
pending. The status banner and scroll/focus behavior remain in place.
Validated with 28 targeted tests, TypeScript, scoped ESLint, production build,
and a fresh-server browser check covering upload-to-generation without room
questions and preservation through edit/save/reload. Deployment is pending.

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
correct rooms and dimensions. Full Interior, Kitchen, Bedrooms, combined and selected-room
scopes are available only when relevant rooms are present. After scope selection,
each included room gets a work checklist based on its detected type and plan
observations. Kitchen cabinetry/counters, bedroom storage, living-room features,
bathroom fittings and other room-specific work have separate fields. Known
ceiling/floor coverage is prefilled from reliable room dimensions; cabinet/wall
measurements are never substituted with floor area. User requirements and unknown
measurements are retained. Finish, optional budget and missing client/location
questions run locally without model calls. Existing client/city answers skip the
client step. The no-plan path collects rooms directly.

Scope now starts with an explicit yes/no question about whole-plan coverage.
No opens an initially empty room selection, with optional focused presets.
Each applicable room feature (including TV units) needs an explicit yes/no
answer; suggested essentials are not treated as confirmed decisions. Optional
measurements and requirements expand only for included work. A design-direction
step confirms coordinated finishes and retention of existing furniture/finishes;
these choices and notes are stored in the brief and passed to generation.
The server rejects contradictions between feature decisions and included items.

The workflow dialog has a bounded viewport height, one scrolling content panel,
and fixed header/footer regions. Upload/analysis/generation progress is displayed
in a fixed status region directly below the header, with cancellation always
available in the footer. Content is inert while a request is pending. Step and
room changes reset the panel scroll and focus the step heading without scrolling
the underlying page. Validation focuses and reveals the first unanswered work
question; other errors are shown in the fixed footer.
The catalogue context is capped at 60 candidates with shortened specifications; canonical
rates and full provenance remain on the server. No model call is made for each form field.

Structured requests propose work for at most four rooms each, two batches at a
time. A deterministic coverage check creates any confirmed work fields omitted
by sparse model output. All selected rooms and work remain present, including
items with pending measurements or pricing. Up to 40 detected rooms and 600
quotation items across 80 editor sections are supported; capacity violations
fail visibly instead of truncating rows. The model cannot choose arbitrary prices or taxes.
The server resolves current approved rate references first, then researches missing
rates using OpenAI Responses web search, then uses labelled recent historical rates
where available. Product names must match referenced rates. Currency/location
filters apply. Unknown rates/quantities stay null and totals are explicitly partial.
Live research is implemented but account-specific access is not verified locally.
My Library → Items has an explicit approval panel; historic patterns are never
silently promoted to approved rates. Approved rates exclude GST; inclusions and verification
date are recorded. Deactivation preserves historical evidence.

### Free-text requirements and exclusions (October 27, 2026)

October 28 update: "Explain it your way" is the primary design brief for
positive requirements as well as exclusions. Interpretation captures overall,
room and item finish tiers; explicit scope/room changes; requested inclusions; exact materials, hardware,
colours and detailing; and design direction. Explicit note requirements
override selector defaults and earlier checklists. Only stated intent is
extracted; defaults are used where notes are silent. Unsupported requests are
retained as review notes instead of being silently discarded or billed as sqft.

Custom item instructions replace conflicting generic descriptions/specifications
and are included in pricing search/cache identities. Generic or close catalogue
matches cannot satisfy a custom specification without an exact match. Research
is grouped by the requested item/room tier, allowing mixed-quality rooms.
Fallback pricing receives the primary brief and excludes incompatible references.
Changes to the brief require full regeneration rather than updating a subset of
rooms under inconsistent requirements. The estimate exposes a collapsed
"Your brief, prioritised" summary and retains the interpretation for admin review.

When typed/transcribed requirements or room notes are present, the server
interprets explicit exclusions with constrained room names and supported work
keys before generating or researching prices. It understands coordinated
negation, common ceiling typos, room-specific exceptions and paraphrases.
Clear global negatives also have a conservative deterministic backup; style
preferences and nuanced room/exception language are left to interpretation.
Client-supplied interpretations are discarded and recomputed from current notes.

Exclusions override default work, optional extras and older checklists. They
are enforced while assembling items, building the estimate, preserving older
items, merging regenerated rooms, retrying prices and transferring the result
into the editor. Empty rooms after exclusions remain unpriced rather than
having default work restored; a request with no remaining work is rejected.
The estimate shows a collapsed summary of applied exclusions, and the saved
AI brief retains the interpretation for the admin popup. No SQL migration is
required. An interpretation failure stops generation rather than silently
discarding the customer's requirements.

### Empty-catalogue pricing

Finish-aware pricing (October 27, 2026): Basic, Standard, Premium and Luxury
are separate quality constraints. Untagged catalogue rates remain usable for
Standard; other tiers require an explicit matching tier in the reference.
Missing compatible rates trigger city/currency/specification-specific web
research. Non-Standard observations require a matching finish tier and
source-supported tier compatibility. Generic or different-tier prices are
rejected rather than multiplied. Search/cache identities include the tier and
structured item specifications. Existing manual rates remain user-controlled.

The estimate and price evidence record their finish tier. If no comparable
source exists, automatic completion may use a labelled AI allowance for that
tier, with assumptions and a range; it is never presented as a retrieved price.
Retrying pricing rechecks tier compatibility. Changing tier during a partial
room regeneration requires regenerating the full estimate to avoid mixing tiers.

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

### Recovering an incomplete estimate

The preview now offers a one-item-at-a-time completion form for missing work-face
width/length and height, plus an optional known unit rate. These details are validated,
stored and recalculated on the server without a model call (`action: complete`).
User-entered pricing is labelled separately. A project budget is never used as a rate.
`Retry pricing only` reuses stored sections, quantities, IDs and manual rates; it runs
fresh market research without rerunning plan analysis or item generation. Model/account
configuration, usage-limit, timeout and invalid-search-output failures now have distinct
safe messages under “Why some prices are missing”, instead of a generic swallowed error.
Running-foot source rates can normalize to sqft only when the user explicitly supplied
the work height: per-rft rate ÷ height. The conversion and its height are recorded in
price evidence; changing height requires checking that rate. No default cabinet heights
or inferred room-to-cabinet quantities are introduced.

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
The editor transfer verifies every expected item identity and count. Refinement
preserves matching item IDs, manual rates and explicit dimensions; older estimates
without a work checklist retain omitted rows. Only explicit checklist deselection
removes work during room refinement. Nested saves are read back and reconciled
before navigation. Browser verification covers Edit Quotation, Save as Draft and
reload without losing selected fields. Separately billed services stay listed
as pending, with their billing basis in the description; they are not converted
to square-foot rates.
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

The October 15 scope/preservation update passed 136 targeted automated tests,
TypeScript, scoped ESLint, a production Next build and the mocked browser flow
at 320/390/768/1440 widths. A 25-room/75-item regression covers both API batching
and transfer into the existing editor. These frontend changes await deployment.

The subsequent guided-question/navigation update passed 129 AI/builder tests,
TypeScript, scoped ESLint and the production build. An isolated fresh production
test server verified pinned loading/cancel controls at 320/390/768/1440 widths,
scroll/focus resets between steps and rooms, whole-plan and selected-room paths,
explicit TV-unit rejection, design answers, and preservation through edit/save/reload.
Browser requests used synthetic data and mocked provider/database responses.

API format verified against official OpenAI documentation:
https://developers.openai.com/api/docs/guides/file-inputs
PDFs use Responses `input_file` data; images use `input_image`. Provider requests are
server-side, bounded by a deadline and use `store: false`.
